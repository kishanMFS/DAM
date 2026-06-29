import db from '../utils/db.js';
import type { Asset, AssetFile, MediaTask } from '../types/assetTypes.js';
import { RandomUUIDOptions } from 'node:crypto';
// import { UUID } from 'crypto';

// import { User } from '@/types/authServiceTypes.js';

export async function createAsset(task: MediaTask, originalName: string, storage_key: string) {
  return db.one(
    `
      INSERT INTO assets
      (
        original_name,
        storage_key,
        status,
        progress,
        uploaded_by,
        parentid
      )
      VALUES
      ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `,
    [
      originalName,
      storage_key,
      "processing",
      0,
      task.userid,
      task.fileid
    ]
  );
}

export async function updateAssetProgress(
    assetId: RandomUUIDOptions,
    progress: number,
    status: string
) {
    return db.none(
      `
        UPDATE assets
        SET
            progress = $2,
            status = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [assetId, progress, status]
    );
}

export async function updateAsset(
    assetId: RandomUUIDOptions,
    fileSize: string, 
    mimeType: string
) {
    db.none(
      `
        UPDATE assets
        SET
            mime_type = $2,
            file_size = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [assetId, mimeType, fileSize]
    );
}

export async function updateAssetStatus(
    assetId: RandomUUIDOptions,
    status: string
) {
    db.none(
      `
        UPDATE assets
        SET status = $2,
            updated_at = NOW()
        WHERE id = $1
      `,
      [assetId, status]
    );
}

export async function getAsset(assetId: string) {
  return db.oneOrNone(
    `
      SELECT
        asset_id,
        status,
        progress,
        thumbnail_path,
        video_240,
        video_480,
        video_720,
        error_message
      FROM  tbl_assets
      WHERE asset_id = $1
      `,
      [assetId]
  );
}

export const getAssets = async (userid: string) => {
  const result = {
    success: false,
    Assets: [] as Asset[],
    message: '',
  };
  const assets = await db.manyOrNone<Asset>(
    `   SELECT  *
        FROM    assets
        WHERE   1=1
                AND uploaded_by = $1
    `,
    [userid],
  );
  if (assets) {
    result.success = true;
    result.message = 'Assets fetched successfully';
    result.Assets = assets;
  }
  return result;
};

export async function failAsset(
    assetId: string,
    error: string
) {
    return db.none(
      `
      UPDATE assets
      SET
        status = 'failed',
        error_message = $2,
        updated_at = NOW()
      WHERE asset_id = $1
      `,
      [assetId, error]
    );
}

export const insertAssetDetails = async (files: AssetFile[], userid: string) => {
  const result = {
    success: false,

    message: '',
  };

  const values: string[] = [];
  const params: unknown[] = [];

  files.forEach((file, index) => {
    const i = index * 5;

    values.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);

    params.push(file.objectName, file.originalName, file.fileType, file.size, userid);
  });

  await db.none(
    `
      INSERT INTO assets
      (
        storage_key,
        original_name,
        mime_type,
        file_size,
        uploaded_by
      )
      VALUES ${values.join(',')}
    `,
    params,
  );

  result.success = true;
  result.message = 'assets details uploaded successfully';

  return result;
};
