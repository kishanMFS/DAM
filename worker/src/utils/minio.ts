import "../config/env.js";
import { Client } from "minio";

const bucketName = process.env.MINIO_BUCKET || "dam-assets";

export const minio = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "127.0.0.1",
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || "",
  secretKey:
    process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || "",
});

export async function initializeMinio() {
  const exists = await minio.bucketExists(bucketName);

  if (!exists) {
    await minio.makeBucket(bucketName);
  }
}
