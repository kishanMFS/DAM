import fs from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
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
import { processImage } from "../src/services/imageProcessor.js";

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

const task = {
  fileid: "source-image-id",
  original_name: "test-image.png",
  objectName: "uploads/source-image.png",
  bucket: "uploads",
  fileType: "image/png",
  userid: "user-id",
};

describe("processImage", () => {
  let directory: string;
  let inputPath: string;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "dam-worker-image-"));
    inputPath = path.join(directory, "input.png");
    await sharp({
      create: {
        width: 640,
        height: 320,
        channels: 3,
        background: { r: 30, g: 90, b: 160 },
      },
    })
      .png()
      .toFile(inputPath);

    mockedDb.one.mockResolvedValue({ id: "thumbnail-asset-id" } as never);
    mockedDb.none.mockResolvedValue(undefined as never);
    mockedDb.oneOrNone.mockResolvedValue({ id: "thumbnail-asset-id" } as never);
    mockedMinio.fPutObject.mockResolvedValue("etag" as never);
    mockedMinio.removeObject.mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    await fs.rm(path.resolve("temp/thumbnails/test-image.jpg"), {
      force: true,
    });
    await fs.rm(directory, { recursive: true, force: true });
  });

  test("creates a real JPEG thumbnail, stores extracted metadata, and cleans the temporary output", async () => {
    let uploadedThumbnail: Buffer | undefined;
    mockedMinio.fPutObject.mockImplementation(
      async (_bucket, objectName, filePath) => {
        expect(objectName).toBe("thumbnails/test-image.jpg");
        uploadedThumbnail = await fs.readFile(filePath as string);
        return { etag: "etag", versionId: null };
      },
    );

    await processImage(task, inputPath);

    expect(uploadedThumbnail).toBeDefined();
    const metadata = await sharp(uploadedThumbnail).metadata();
    expect(metadata).toMatchObject({
      format: "jpeg",
      width: 300,
      height: 150,
    });
    expect(mockedDb.one).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO assets"),
      expect.arrayContaining(["test-image.jpg", "thumbnails/test-image.jpg"]),
    );
    expect(mockedDb.none).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE assets"),
      expect.arrayContaining([
        "thumbnail-asset-id",
        expect.any(Number),
        "image/jpeg",
      ]),
    );

    const tagInsert = mockedDb.none.mock.calls.find(([query]) =>
      String(query).includes("INSERT INTO assettags"),
    );
    expect(tagInsert).toBeDefined();
    const tags = JSON.parse(String(tagInsert?.[1]?.[1])) as {
      dimensions: { width: number; height: number };
      mimeType: string;
    };
    expect(tags).toMatchObject({
      mimeType: "image/jpeg",
      dimensions: { width: 300, height: 150 },
    });
    expect(mockedDb.none).toHaveBeenCalledWith(
      expect.stringContaining("SET status = $2"),
      ["thumbnail-asset-id", "complete"],
    );
    await expect(
      fs.access(path.resolve("temp/thumbnails/test-image.jpg")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  test("removes the uploaded thumbnail if its asset was deleted before completion", async () => {
    mockedDb.oneOrNone.mockResolvedValue(null as never);

    await processImage(task, inputPath);

    expect(mockedMinio.removeObject).toHaveBeenCalledWith(
      "uploads",
      "thumbnails/test-image.jpg",
    );
    expect(mockedDb.none).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO assettags"),
      expect.anything(),
    );
  });

  test("marks processing as failed and rejects invalid image input", async () => {
    await expect(
      processImage(task, path.join(directory, "missing.png")),
    ).rejects.toBeDefined();
    expect(mockedDb.none).toHaveBeenCalledWith(
      expect.stringContaining("SET status = $2"),
      ["thumbnail-asset-id", "error"],
    );
  });

  test("marks the asset failed and propagates storage upload failures", async () => {
    mockedMinio.fPutObject.mockRejectedValue(new Error("MinIO unavailable"));

    await expect(processImage(task, inputPath)).rejects.toThrow(
      "MinIO unavailable",
    );
    expect(mockedDb.none).toHaveBeenCalledWith(
      expect.stringContaining("SET status = $2"),
      ["thumbnail-asset-id", "error"],
    );
  });
});
