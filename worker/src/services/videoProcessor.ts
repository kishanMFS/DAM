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
import { randomUUID } from "crypto";

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
  let assetid = randomUUID();
  return new Promise<string>((resolve, reject) => {
    ffmpeg(input)
      .videoCodec("libx264")
      .size(`?x${height}`)
      .output(output)
      .on("start", async (cmd) => {
        console.log("Started:", cmd);
        const createAssetResponse = await assetModel.createAsset(
          task,
          originalName,
          storage_key,
        );
        assetid = createAssetResponse.id;
        // console.log(assetid)
      })
      .on("progress", async (progress) => {
        console.log(`Progress: ${progress.percent?.toFixed(2)}%`);

        await assetModel.updateAssetProgress(
          assetid,
          progress.percent! || 0,
          "processing",
        );
      })
      .on("end", async () => {
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

        console.log("Video conversion completed.");
        resolve(assetid);
      })
      .on("error", async (err) => {
        await assetModel.updateAssetStatus(assetid, "error");
        console.log(err);
        const errorMessage = "video parsing error";
        logger.error(errorMessage, {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        reject(0);
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

  // Create output directories if they don't exist
  const baseName = path.parse(task.original_name).name;

  // Convert videos in parallel
  const heights =
    sourceHeight >= 1080 ? [240, 480, 720, 1080] : [240, 480, 720];
  const conversions = heights.map((height) => {
    const outputDir = path.resolve(`temp/videos/${height}`);
    fs.mkdirSync(outputDir, { recursive: true });
    const fileName = `${baseName} - ${height}.mp4`;

    return {
      outputPath: path.join(outputDir, fileName),
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

  // Upload converted files in parallel
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

  // Create thumbnail
  const thumbDir = path.resolve("temp/thumbnails");
  fs.mkdirSync(thumbDir, { recursive: true });

  const thumbPath = path.join(thumbDir, `${baseName}.jpg`);
  const thumbObject = `thumbnails/${baseName}.jpg`;

  await thumbnail(file, thumbPath);

  await minio.fPutObject(task.bucket, thumbObject, thumbPath);
  const thumbnailLinked = await assetModel.updateThumbnailKey(
    task.fileid,
    thumbObject,
  );
  if (!thumbnailLinked) {
    await minio.removeObject(task.bucket, thumbObject);
  }
}
