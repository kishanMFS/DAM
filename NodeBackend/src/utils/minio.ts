import { Client } from 'minio';

export const bucketName = process.env.MINIO_BUCKET || 'uploads';
const baseUrl = process.env.MINIO_PUBLIC_URL!;

export const minio = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: Number(process.env.MINIO_PORT),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export function replaceMinioUrl(presignedUrl: string): string {
  // Replace http://minio:9000 with the public base URL
  return presignedUrl.replace(`http://minio:${process.env.MINIO_PORT}`, baseUrl);
}

export async function initializeMinio() {
  const exists = await minio.bucketExists(bucketName);

  if (!exists) {
    await minio.makeBucket(bucketName);
  }
}
