import env from '../config/env.js';
import { Client } from 'minio';

export const bucketName = env.MINIO_BUCKET;

export const minio = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: false,
  region: env.MINIO_REGION,
  accessKey: env.MINIO_ACCESS_KEY || '',
  secretKey: env.MINIO_SECRET_KEY || '',
});

const publicMinioUrl = env.MINIO_PUBLIC_URL ? new URL(env.MINIO_PUBLIC_URL) : null;

export const presignedMinio = publicMinioUrl
  ? new Client({
      endPoint: publicMinioUrl.hostname,
      port: Number(publicMinioUrl.port || (publicMinioUrl.protocol === 'https:' ? 443 : 80)),
      useSSL: publicMinioUrl.protocol === 'https:',
      region: env.MINIO_REGION,
      accessKey: env.MINIO_ACCESS_KEY || '',
      secretKey: env.MINIO_SECRET_KEY || '',
    })
  : minio;

export async function initializeMinio() {
  const exists = await minio.bucketExists(bucketName);

  if (!exists) {
    await minio.makeBucket(bucketName);
  }
}
