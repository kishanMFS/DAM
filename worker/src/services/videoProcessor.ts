

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobe from 'ffprobe-static';

import path from "path";
// import { uploadObject } from "./minio";
import { minio } from "../utils/minio.js";

ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobe.path);

function convert (input:string, output:string, height:number){
    return new Promise((resolve, reject)=>{
        ffmpeg(input)
        .videoCodec("libx264")
        .size(`?x${height}`)
        .output(output)
        .on("start", (cmd) => {
            console.log("Started:", cmd);
        })
        .on("progress", (progress) => {
            console.log(`Progress: ${progress.percent?.toFixed(2)}%`);
        })
        .on("end", () => {
            console.log("Video conversion completed.");
            resolve(1);
        })
        .on("error",reject)
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
        .on("error",reject);
    });

}

export async function processVideo(task: { bucket: string; objectName: string; },file:string){

    const p240 = path.join("temp","240.mp4");
    const p480 = path.join("temp","480.mp4");
    const p720 = path.join("temp","720.mp4");

    await convert(file,p240,240);
    await convert(file,p480,480);
    await convert(file,p720,720);

    // await uploadObject(task.bucket,"videos/240/"+path.basename(task.objectName),p240);
    await minio.fPutObject(
        task.bucket,
        "videos/240/" + path.basename(task.objectName),
        p240
    );

    // await uploadObject(task.bucket,"videos/480/"+path.basename(task.objectName),p480);
    await minio.fPutObject(
        task.bucket,
        "videos/480/" + path.basename(task.objectName),
        p480
    );

    // await uploadObject(task.bucket,"videos/720/"+path.basename(task.objectName),p720);
    await minio.fPutObject(
        task.bucket,
        "videos/720/" + path.basename(task.objectName),
        p720
    );

    // ceate video thumbnails
    await thumbnail(file,"temp/thumb.jpg");
    await minio.fPutObject(
        task.bucket,
        "thumbnails/thumb.jpg",
        "temp/thumb.jpg"
    );

}