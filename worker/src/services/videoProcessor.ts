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

  return new Promise<string>((resolve, reject) => {
    const fail = (error: unknown) => {
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
      .on("start", () => {
        void assetModel
          .createAsset(
            task,
            originalName,
            storage_key,
            mime.lookup(output) || "video/mp4",
          )
          .then(async (createAssetResponse) => {
            const createdAssetId = createAssetResponse.id;
            assetid = createdAssetId;
            await assetModel.updateAssetStatus(createdAssetId, "processing");
          })
          .catch(fail);
      })
      .on("progress", (progress) => {
        const progressValue =
          typeof progress.percent === "number" &&
          Number.isFinite(progress.percent)
            ? progress.percent
            : 0;
        console.log(`Progress: ${progressValue.toFixed(2)}%`);

        const currentAssetId = assetid;
        if (currentAssetId) {
          void assetModel
            .updateAssetProgress(
              currentAssetId,
              Math.max(0, Math.min(100, progressValue)),
              "processing",
            )
            .catch(fail);
        }
      })
      .on("end", () => {
        void (async () => {
          if (!assetid) {
            throw new Error("Video variant asset was not created");
          }

          const info = await stat(output);
          const fileSize = info.size / 1024 / 1024;
          const mimeType = mime.lookup(output) || "video/mp4";
          const probe = await probeVideo(output);
          const videoStream = (probe.streams as VideoStream[])?.find(
            (stream) => stream.codec_type === "video",
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

          resolve(assetid);
        })().catch(fail);
      })
      .on("error", (error) => {
        fail(error);
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
  if (!(await assetModel.assetExists(task.fileid))) return;

  // Create output directories if they don't exist
  const output240Dir = path.resolve("temp/videos/240");
  const output480Dir = path.resolve("temp/videos/480");
  const output720Dir = path.resolve("temp/videos/720");
  const output1080Dir = path.resolve("temp/videos/1080");

  fs.mkdirSync(output240Dir, { recursive: true });
  fs.mkdirSync(output480Dir, { recursive: true });
  fs.mkdirSync(output720Dir, { recursive: true });
  fs.mkdirSync(output1080Dir, { recursive: true });

  const baseName = path.parse(task.original_name).name;

  let sourceHeight = 0;
  try {
    const sourceProbe = await probeVideo(file);
    const sourceVideo = (sourceProbe.streams as VideoStream[]).find(
      (stream) => stream.codec_type === "video",
    );
    sourceHeight = sourceVideo?.height ?? 0;
    await assetModel.insertAssetTags(task.fileid, {
      filename: task.original_name,
      mimeType: task.fileType,
      dimensions: { width: sourceVideo?.width, height: sourceHeight },
      durationSeconds:
        Number(sourceVideo?.duration || sourceProbe.format?.duration) ||
        undefined,
    });
  } catch (error) {
    await assetModel.updateAssetStatus(task.fileid, "error");
    throw error;
  }

  const heights =
    sourceHeight >= 1080
      ? ([240, 480, 720, 1080] as const)
      : ([240, 480, 720] as const);
  const outputDirectories: Record<240 | 480 | 720 | 1080, string> = {
    240: output240Dir,
    480: output480Dir,
    720: output720Dir,
    1080: output1080Dir,
  };
  const conversions = heights.map((height) => {
    const fileName = `${baseName} - ${height}.mp4`;
    return {
      height,
      fileName,
      outputPath: path.join(outputDirectories[height], fileName),
      objectName: `videos/${height}/${fileName}`,
    };
  });

  try {
    const conversionResults = await Promise.allSettled(
      conversions.map(({ outputPath, height, fileName, objectName }) =>
        convert(file, outputPath, height, task, fileName, objectName),
      ),
    );
    const conversionErrors = conversionResults.flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    if (conversionErrors.length > 0) {
      throw new AggregateError(
        conversionErrors,
        "Video variant conversion failed",
      );
    }

    // Upload converted files in parallel
    await Promise.all(
      conversions.map(({ objectName, outputPath }) =>
        minio.fPutObject(task.bucket, objectName, outputPath),
      ),
    );

    const retainedVariants = await Promise.all(
      conversions.map(async ({ objectName }, index) => ({
        objectName,
        exists: await assetModel.assetExists(
          conversionResults[index].status === "fulfilled"
            ? conversionResults[index].value
            : "",
        ),
      })),
    );
    await Promise.all(
      retainedVariants
        .filter(({ exists }) => !exists)
        .map(({ objectName }) => minio.removeObject(task.bucket, objectName)),
    );

    // Create thumbnail
    const thumbDir = path.resolve("temp/thumbnails");
    fs.mkdirSync(thumbDir, { recursive: true });

    const thumbPath = path.join(thumbDir, `${baseName}.jpg`);

    await thumbnail(file, thumbPath);

    const thumbnailObject = `thumbnails/${baseName}.jpg`;
    await minio.fPutObject(task.bucket, thumbnailObject, thumbPath);
    if (await assetModel.assetExists(task.fileid)) {
      await assetModel.updateAssetStatus(task.fileid, "complete");
    } else {
      await minio.removeObject(task.bucket, thumbnailObject);
    }
  } catch (error) {
    await assetModel.updateAssetStatus(task.fileid, "error");
    throw error;
  }
}
