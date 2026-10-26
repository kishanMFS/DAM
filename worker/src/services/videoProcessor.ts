import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import * as assetModel from "../models/assetModel.js";
import { stat } from "fs/promises";
import mime from "mime-types";
import fs from "fs";
import logger from "../utils/winston.js";

import path from "path";
// import { uploadObject } from "./minio";
import { minio } from "../utils/minio.js";
import type { MediaTask } from "@dam/shared-types";
import type { VideoStream } from "../types/videoTypes.js";

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
ffmpeg.setFfprobePath(ffprobe.path);

function probeVideo(file: string): Promise<FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}

function convert(
  input: string,
  output: string,
  height: number,
  task: MediaTask,
  originalName: string,
  storage_key: string,
): Promise<string> {
  let assetid: string | undefined;
  let settled = false;

  return new Promise<string>((resolve, reject) => {
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;

      if (assetid) {
        void assetModel
          .updateAssetStatus(assetid, "error")
          .catch((statusError) => {
            logger.error("Unable to mark failed video variant", {
              assetId: assetid,
              message:
                statusError instanceof Error
                  ? statusError.message
                  : String(statusError),
            });
          });
      }

      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      logger.error("Video conversion failed", {
        message: normalizedError.message,
        stack: normalizedError.stack,
      });
      reject(normalizedError);
    };

    ffmpeg(input)
      .videoCodec("libx264")
      .size(`?x${height}`)
      .output(output)
      .on("start", (cmd) => {
        console.log("Started:", cmd);
        void assetModel
          .createAsset(task, originalName, storage_key)
          .then(async (createAssetResponse) => {
            const createdAssetId = createAssetResponse.id;
            assetid = createdAssetId;
            if (settled) {
              await assetModel.updateAssetStatus(createdAssetId, "error");
            }
          })
          .catch(fail);
      })
      .on("progress", (progress) => {
        console.log(`Progress: ${progress.percent?.toFixed(2)}%`);

        const currentAssetId = assetid;
        if (currentAssetId && !settled) {
          void assetModel
            .updateAssetProgress(
              currentAssetId,
              progress.percent || 0,
              "processing",
            )
            .catch(fail);
        }
      })
      .on("end", () => {
        void (async () => {
          if (settled) return;
          if (!assetid) {
            throw new Error("Video variant asset was not created");
          }

          const info = await stat(output);
          const fileSize = info.size / 1024 / 1024;
          const mimeType = mime.lookup(output) || "application/octet-stream";
          const probe = await probeVideo(output);
          const videoStream = (probe.streams as VideoStream[])?.find(
            (s) => s.codec_type === "video",
          );

          const tags = {
            filename: originalName,
            mimeType,
            fileType: videoStream?.codec_name || "video",
            fileSizeMB: fileSize,
            dimensions: {
              width: videoStream?.width,
              height: videoStream?.height,
            },
            durationSeconds:
              Number(videoStream?.duration || probe.format?.duration) ||
              undefined,
            metadata: {
              formatName: probe.format?.format_name,
              bitRate: videoStream?.bit_rate
                ? Number(videoStream.bit_rate)
                : undefined,
            },
          };

          await assetModel.updateAsset(assetid, fileSize, mimeType);
          await assetModel.insertAssetTags(assetid, tags);
          await assetModel.updateAssetStatus(assetid, "complete");

          if (settled) return;
          settled = true;
          console.log("Video conversion completed.");
          resolve(assetid);
        })().catch(fail);
      })
      .on("error", (err) => {
        console.log(err);
        fail(err);
      })
      .run();
  });
}

function thumbnail(input: string, output: string) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .screenshots({
        timestamps: ["5%"],
        filename: path.basename(output),
        folder: path.dirname(output),
        size: "320x?",
      })
      .on("end", resolve)
      .on("error", (err, stdout, stderr) => {
        const errorMessage = "thumbnail parsing error";
        logger.error(errorMessage, {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        console.error(err);
        console.error(stderr);
        reject(err);
      });
  });
}

export async function processVideo(task: MediaTask, file: string) {
  const temporaryFiles: string[] = [];
  let processingError: unknown;

  try {
    const sourceProbe = await probeVideo(file);
    const sourceVideo = (sourceProbe.streams as VideoStream[]).find(
      (stream) => stream.codec_type === "video",
    );
    const sourceHeight = sourceVideo?.height ?? 0;
    await assetModel.insertAssetTags(task.fileid, {
      filename: task.original_name,
      mimeType: task.fileType,
      fileType: sourceVideo?.codec_name || "video",
      dimensions: {
        width: sourceVideo?.width,
        height: sourceVideo?.height,
      },
      durationSeconds:
        Number(sourceVideo?.duration || sourceProbe.format?.duration) ||
        undefined,
    });

    const baseName = path.parse(task.original_name).name;
    const heights =
      sourceHeight >= 1080 ? [240, 480, 720, 1080] : [240, 480, 720];
    const conversions = heights.map((height) => {
      const outputDir = path.resolve(`temp/videos/${height}`);
      fs.mkdirSync(outputDir, { recursive: true });
      const fileName = `${baseName} - ${height}.mp4`;
      const outputPath = path.join(outputDir, fileName);
      temporaryFiles.push(outputPath);

      return {
        outputPath,
        height,
        fileName,
        objectName: `videos/${height}/${fileName}`,
      };
    });

    const conversionAssetIds = await Promise.all(
      conversions.map(({ outputPath, height, fileName, objectName }) =>
        convert(file, outputPath, height, task, fileName, objectName),
      ),
    );

    await Promise.all(
      conversions.map(({ outputPath, objectName }) =>
        minio.fPutObject(task.bucket, objectName, outputPath),
      ),
    );

    const conversionAssets = await Promise.all(
      conversions.map(async ({ objectName }, index) => ({
        objectName,
        exists: await assetModel.assetExists(conversionAssetIds[index]),
      })),
    );
    await Promise.all(
      conversionAssets
        .filter((asset) => !asset.exists)
        .map(({ objectName }) => minio.removeObject(task.bucket, objectName)),
    );

    const thumbDir = path.resolve("temp/thumbnails");
    fs.mkdirSync(thumbDir, { recursive: true });

    const thumbPath = path.join(thumbDir, `${baseName}.jpg`);
    const thumbObject = `thumbnails/${baseName}.jpg`;
    temporaryFiles.push(thumbPath);

    await thumbnail(file, thumbPath);

    await minio.fPutObject(task.bucket, thumbObject, thumbPath);
    const thumbnailLinked = await assetModel.updateThumbnailKey(
      task.fileid,
      thumbObject,
    );
    if (!thumbnailLinked) {
      await minio.removeObject(task.bucket, thumbObject);
    }
  } catch (error) {
    processingError = error;
    throw error;
  } finally {
    const cleanupErrors: unknown[] = [];
    for (const temporaryFile of temporaryFiles) {
      try {
        await fs.promises.unlink(temporaryFile);
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          )
        ) {
          cleanupErrors.push(error);
        }
      }
    }

    if (cleanupErrors.length > 0) {
      logger.error("Video temporary-file cleanup failed", {
        files: temporaryFiles,
        errors: cleanupErrors.map((error) =>
          error instanceof Error ? error.message : String(error),
        ),
      });
      if (processingError === undefined) {
        throw new AggregateError(
          cleanupErrors,
          "Failed to remove temporary video processing files",
        );
      }
    }
  }
}
