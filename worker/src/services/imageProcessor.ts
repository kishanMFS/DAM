import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { stat } from "fs/promises";
import mime from "mime-types";
import { randomUUID } from "crypto";

import { minio } from "../utils/minio.js";
import logger from "../utils/winston.js";
import * as assetModel from "../models/assetModel.js";
import { MediaTask } from "../types/assetTypes.js";

export async function processImage(
  task: MediaTask,
  filePath: string,
) {
  const thumbDir = path.resolve("temp/thumbnails");
  await fs.mkdir(thumbDir, { recursive: true });

  const baseName = path.parse(task.original_name).name;
  const thumbFileName = `${baseName}.jpg`;

  const thumbPath = path.join(thumbDir, thumbFileName);
  const thumbObject = `thumbnails/${thumbFileName}`;

  let assetid = randomUUID();

  try {
    // Create asset
    const createAssetResponse = await assetModel.createAsset(
      task,
      thumbFileName,
      thumbObject,
    );

    assetid = createAssetResponse.id;

    // Processing started
    await assetModel.updateAssetProgress(
      assetid,
      10,
      "processing",
    );

    // Generate thumbnail
    await sharp(filePath)
      .resize({ width: 300 })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);

    await assetModel.updateAssetProgress(
      assetid,
      60,
      "processing",
    );

    // Upload thumbnail
    await minio.fPutObject(
      task.bucket,
      thumbObject,
      thumbPath,
    );

    await assetModel.updateAssetProgress(
      assetid,
      90,
      "processing",
    );

    // Get uploaded file info
    const info = await stat(thumbPath);
    const fileSize = info.size / 1024 / 1024;
    const mimeType =
      mime.lookup(thumbPath) || "application/octet-stream";

    await assetModel.updateAsset(
      assetid,
      fileSize,
      mimeType,
    );

    // Complete
    await assetModel.updateAssetProgress(
      assetid,
      100,
      "processing",
    );

    await assetModel.updateAssetStatus(
      assetid,
      "complete",
    );

    // Cleanup
    await fs.unlink(thumbPath).catch(() => {});
  } catch (err) {
    await assetModel.updateAssetStatus(assetid, "error");

    logger.error("Image processing error", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    throw err;
  }
}