import { Client } from "minio";
const bucketName = process.env.MINIO_BUCKET || "uploads";

export const minio = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export async function initializeMinio() {
  const exists = await minio.bucketExists(bucketName);

  if (!exists) {
    await minio.makeBucket(bucketName);
  }
}
