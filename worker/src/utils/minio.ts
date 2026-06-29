

import { Client } from "minio";

export const minio = new Client({
    endPoint:process.env.MINIO_ENDPOINT!,
    port:Number(process.env.MINIO_PORT),
    useSSL:false,
    accessKey:process.env.MINIO_ACCESS_KEY!,
    secretKey:process.env.MINIO_SECRET_KEY!
});