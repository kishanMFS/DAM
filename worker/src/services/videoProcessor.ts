

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from 'ffprobe-static';
import * as assetModel from '../models/assetModel.js';
import { stat } from "fs/promises";
import mime from "mime-types";
import fs from "fs";
import logger from '../utils/winston.js';

import path from "path";
// import { uploadObject } from "./minio";
import { minio } from "../utils/minio.js";
import { MediaTask } from "../types/assetTypes.js";
import { randomUUID } from "crypto";

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
ffmpeg.setFfprobePath(ffprobe.path);

function convert (input:string, output:string, height:number, task:MediaTask, originalName: string, storage_key: string){
    let assetid = randomUUID;
    return new Promise((resolve, reject)=>{
        ffmpeg(input)
        .videoCodec("libx264")
        .size(`?x${height}`)
        .output(output)
        .on("start", async (cmd) => {
            console.log("Started:", cmd);
            console.log(task)
            const createAssetResponse = await assetModel.createAsset(task, originalName, storage_key);
            assetid = createAssetResponse.id;
            console.log(assetid)
        })
        .on("progress", async (progress) => {
            console.log(`Progress: ${progress.percent?.toFixed(2)}%`);

            await assetModel.updateAssetProgress(
                assetid,
                progress.percent,
                "processing"
            );
        })
        .on("end",async () => {
            const info = await stat(output);
            const fileSize = (info.size / 1024 / 1024)
            const mimeType = mime.lookup(output) || "application/octet-stream";

            assetModel.updateAsset(assetid, fileSize, mimeType);
            assetModel.updateAssetStatus(assetid, 'complete');

            console.log("Video conversion completed.");
            resolve('');
        })
        .on("error", async (err) => {
            await assetModel.updateAssetStatus(assetid, 'error');
            console.log(err)
            const errorMessage = 'video parsing error';
            logger.error(errorMessage, {
                message: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? err.stack : undefined,
            });
            reject(0);
        })
        .run();
    });
}

function thumbnail(input:string, output:string){

    return new Promise((resolve,reject)=>{
        ffmpeg(input)
        .screenshots({
            timestamps:["5%"],
            filename:path.basename(output),
            folder:path.dirname(output),
            size:"320x?"
        })
        .on("end",resolve)
        .on("error",(err, stdout, stderr) => {
            const errorMessage = 'thumbnail parsing error';
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

export async function processVideo(task: MediaTask ,file:string){

    // Create output directories if they don't exist
    const output240Dir = path.resolve("temp/videos/240");
    const output480Dir = path.resolve("temp/videos/480");
    const output720Dir = path.resolve("temp/videos/720");

    fs.mkdirSync(output240Dir, { recursive: true });
    fs.mkdirSync(output480Dir, { recursive: true });
    fs.mkdirSync(output720Dir, { recursive: true });

    const baseName = path.parse(task.original_name).name;

    const p240FileName = `${baseName} - 240.mp4`;
    const p480FileName = `${baseName} - 480.mp4`;
    const p720FileName = `${baseName} - 720.mp4`;

    // Local output paths
    const p240 = path.join(output240Dir, p240FileName);
    const p480 = path.join(output480Dir, p480FileName);
    const p720 = path.join(output720Dir, p720FileName);

    // Object names in MinIO
    // const objectBaseName = path.basename(task.objectName);

    const p240Object = `videos/240/${p240FileName}`;
    const p480Object = `videos/480/${p480FileName}`;
    const p720Object = `videos/720/${p720FileName}`;

    // Convert videos
    await convert(file, p240, 240, task, p240FileName, p240Object);
    await convert(file, p480, 480, task, p480FileName, p480Object);
    await convert(file, p720, 720, task, p720FileName, p720Object);

    // Upload converted files
    await minio.fPutObject(task.bucket, p240Object, p240);
    await minio.fPutObject(task.bucket, p480Object, p480);
    await minio.fPutObject(task.bucket, p720Object, p720);

    // Create thumbnail
    const thumbDir = path.resolve("temp/thumbnails");
    fs.mkdirSync(thumbDir, { recursive: true });

    const thumbPath = path.join(thumbDir, `${baseName}.jpg`);

    await thumbnail(file, thumbPath);

    await minio.fPutObject(
        task.bucket,
        `thumbnails/${baseName}.jpg`,
        thumbPath
    );

}