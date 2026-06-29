

import sharp from "sharp";
import path from "path";

// import { uploadObject } from "./minio";
import { minio } from "../utils/minio.js";

export async function processImage(task: { bucket: string; }, filePath:string){

    const thumb = path.join(
        "temp",
        "thumb_" + path.basename(filePath)
    );

    await sharp(filePath)
        .resize(300)
        .jpeg()
        .toFile(thumb);

    // await uploadObject(
    //     task.bucket,
    //     "thumbnails/"+path.basename(thumb),
    //     thumb
    // );

    await minio.fPutObject(
        task.bucket,
        "thumbnails/" + path.basename(thumb),
        thumb
    );

}