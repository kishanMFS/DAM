import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

export async function createVideoFixture(
  outputPath: string,
  width: number,
  height: number,
): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide an executable path");
  }

  await execFileAsync(ffmpegPath, [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=${width}x${height}:d=1`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-y",
    outputPath,
  ]);
}
