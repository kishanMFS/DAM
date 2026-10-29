import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import db from "../src/utils/db.js";
import { minio } from "../src/utils/minio.js";
import { processVideo } from "../src/services/videoProcessor.js";
import { createVideoFixture } from "./helpers/mediaFixtures.js";

jest.mock("../src/utils/db.js", () => ({
  __esModule: true,
  default: {
    one: jest.fn(),
    none: jest.fn(),
    oneOrNone: jest.fn(),
    manyOrNone: jest.fn(),
  },
}));
jest.mock("../src/utils/minio.js", () => ({
  __esModule: true,
  minio: {
    fPutObject: jest.fn(),
    removeObject: jest.fn(),
  },
}));
jest.mock("../src/utils/winston.js", () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockedDb = jest.mocked(db);
const mockedMinio = jest.mocked(minio);
jest.setTimeout(60_000);

const task = {
  fileid: "source-video-id",
  original_name: "test-video.mp4",
  objectName: "uploads/source-video.mp4",
  bucket: "uploads",
  fileType: "video/mp4",
  userid: "user-id",
};

describe("processVideo", () => {
  let directory: string;
  let inputPath: string;
  let baseName: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "dam-worker-video-"));
    inputPath = path.join(directory, "input.mp4");
    baseName = `test-video-${randomUUID()}`;
    mockedDb.one.mockImplementation(
      async () => ({ id: randomUUID() }) as never,
    );
    mockedDb.none.mockResolvedValue(undefined as never);
    mockedDb.oneOrNone.mockImplementation(
      async () => ({ id: randomUUID() }) as never,
    );
    mockedMinio.fPutObject.mockResolvedValue("etag" as never);
    mockedMinio.removeObject.mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    await Promise.all(
      [240, 480, 720, 1080].map((height) =>
        fs.rm(
          path.resolve(`temp/videos/${height}/${baseName} - ${height}.mp4`),
          { force: true },
        ),
      ),
    );
    await fs.rm(path.resolve(`temp/thumbnails/${baseName}.jpg`), {
      force: true,
    });
    await fs.rm(directory, { recursive: true, force: true });
  });

  test.each([
    [128, 72, [240, 480, 720]],
    [1920, 1080, [240, 480, 720, 1080]],
  ])(
    "transcodes %ix%i source to expected variants, extracts metadata, uploads, and cleans outputs",
    async (width, height, expectedHeights) => {
      await createVideoFixture(inputPath, width, height);

      await processVideo(
        { ...task, original_name: `${baseName}.mp4` },
        inputPath,
      );

      const uploadedObjectNames = mockedMinio.fPutObject.mock.calls.map(
        ([, objectName]) => objectName,
      );
      expect(uploadedObjectNames).toEqual(
        expect.arrayContaining([
          ...expectedHeights.map(
            (variantHeight) =>
              `videos/${variantHeight}/${baseName} - ${variantHeight}.mp4`,
          ),
          `thumbnails/${baseName}.jpg`,
        ]),
      );
      expect(uploadedObjectNames).toHaveLength(expectedHeights.length + 1);

      const tagCalls = mockedDb.none.mock.calls.filter(([query]) =>
        String(query).includes("INSERT INTO assettags"),
      );
      expect(tagCalls).toHaveLength(expectedHeights.length + 1);
      const sourceTags = JSON.parse(String(tagCalls[0][1]?.[1])) as {
        dimensions: { width: number; height: number };
      };
      expect(sourceTags.dimensions).toEqual({ width, height });

      const variantTags = tagCalls.slice(1).map(([, values]) => {
        const tags = JSON.parse(String(values?.[1])) as {
          dimensions: { height: number };
        };
        return tags.dimensions.height;
      });
      expect(variantTags.sort((first, second) => first - second)).toEqual(
        expectedHeights,
      );
      expect(mockedDb.none).toHaveBeenCalledWith(
        expect.stringContaining("SET status = $2"),
        expect.arrayContaining([expect.any(String), "complete"]),
      );
    },
  );

  test("removes converted MinIO objects when the source asset was deleted while processing", async () => {
    await createVideoFixture(inputPath, 128, 72);

    mockedDb.oneOrNone
      .mockResolvedValueOnce({ id: task.fileid } as never)
      .mockResolvedValue(null as never);

    await processVideo(
      { ...task, original_name: `${baseName}.mp4` },
      inputPath,
    );

    expect(mockedMinio.fPutObject).toHaveBeenCalled();
    expect(mockedMinio.removeObject).toHaveBeenCalledTimes(4);

    expect(mockedMinio.removeObject).toHaveBeenCalledWith(
      "uploads",
      expect.stringMatching(/^videos\/(240|480|720)\//),
    );

    expect(mockedMinio.removeObject).toHaveBeenCalledWith(
      "uploads",
      `thumbnails/${baseName}.jpg`,
    );
  });
});
