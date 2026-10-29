import db from '@/utils/db.js';
import type { Asset, AssetFile } from '@dam/shared-types';
// import { randomUUID } from 'crypto';
// import { UUID } from 'crypto';

export const getAssets = async (
  userid: string,
  {
    limit,
    offset,
    search,
    sourceObjectNames,
  }: {
    limit: number;
    offset: number;
    search?: string;
    sourceObjectNames?: string[];
  },
) => {
  const result = {
    success: false,
    Assets: [] as Asset[],
    message: '',
    total: 0,
  };
  const filterParams = [userid || null, search || null, sourceObjectNames ?? null];
  const whereClause = `
    WHERE ($1::text IS NULL OR a.uploaded_by = $1)
      AND (
        $2::text IS NULL
        OR EXISTS (
          SELECT  1
          FROM    assettags search_tags
          WHERE   search_tags.assetid = a.id
                  AND POSITION(LOWER($2) IN LOWER(search_tags.tags)) > 0
        )
      )
      AND (
        $3::text[] IS NULL
        OR a.storage_key = ANY($3::text[])
        OR a.parentid IN (
          SELECT source.id
          FROM assets source
          WHERE source.storage_key = ANY($3::text[])
        )
      )
  `;
  const total = await db.one<{ total: string }>(
    `
      SELECT  COUNT(DISTINCT a.id) AS total
      FROM    assets a
      ${whereClause}
    `,
    filterParams,
  );
  result.total = Number(total.total);

  const assets = await db.manyOrNone<Asset>(
    `
      WITH matching_assets AS (
        SELECT DISTINCT ON (a.id)
               a.*,
               at.tags::jsonb AS tags
        FROM assets a
        LEFT JOIN LATERAL (
          SELECT tags
          FROM assettags
          WHERE assetid = a.id
          ORDER BY created_at DESC
          LIMIT 1
        ) at ON TRUE
        ${whereClause}
        ORDER BY a.id, a.created_at DESC
      )
      SELECT *
      FROM matching_assets
      ORDER BY created_at DESC, id DESC
      LIMIT $4::integer
      OFFSET $5::integer
    `,
    [...filterParams, sourceObjectNames ? null : limit, sourceObjectNames ? null : offset],
  );
  if (assets) {
    result.success = true;
    result.message = 'Assets fetched successfully';
    result.Assets = assets;
  }
  return result;
};

export const insertAssetDetails = async (files: AssetFile[], userid: string) => {
  const result = {
    success: false,
    data: [] as {
      id: string;
      original_name: string;
    }[],
    message: '',
  };

  const values: string[] = [];
  const params: unknown[] = [];

  files.forEach((file, index) => {
    const i = index * 5;

    values.push(`(${i + 1}, ${i + 2}, ${i + 3}, ${i + 4}, ${i + 5})`);

    params.push(file.objectName, file.originalName, file.fileType, file.size, userid);
  });

  const insertAssetDetailsResult = await db.manyOrNone(
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
      RETURNING *
    `,
    params,
  );

  if (insertAssetDetailsResult) {
    result.data = insertAssetDetailsResult;
    result.success = true;
    result.message = 'assets details uploaded successfully';
  }

  return result;
};

export const getDashboardStats = async () => {
  const result = await db.one(`
      SELECT
        (SELECT COUNT(*) FROM assets) AS "totalAssets",
        (SELECT COUNT(*) FROM users) AS "totalUsers",
        (SELECT COALESCE(SUM(download_count),0) FROM assets) AS "totalDownloads",
        (SELECT COALESCE(SUM(file_size),0) FROM assets) AS "storageUsed"
  `);

  return {
    totalAssets: Number(result.totalAssets),
    totalUsers: Number(result.totalUsers),
    totalDownloads: Number(result.totalDownloads),
    storageUsed: Number(result.storageUsed),
  };
};

export const updateDownloadCount = async (fileId: string) => {
  const result = {
    success: false,
    message: '',
    data: null as { id: string; download_count: number } | null,
  };

  const updateResult = await db.oneOrNone(
    `
      UPDATE assets
      SET download_count = COALESCE(download_count, 0) + 1
      WHERE id = $1
      RETURNING id, download_count
    `,
    [fileId],
  );

  if (updateResult) {
    result.success = true;
    result.message = 'Download count updated successfully';
    result.data = {
      id: updateResult.id,
      download_count: Number(updateResult.download_count),
    };
  } else {
    result.message = 'Asset not found';
  }

  return result;
};

export interface AssetStorageObject {
  id: string;
  storage_key: string | null;
  thumbnail_key: string | null;
}

export const deleteAssetTree = async (
  assetId: string,
  removeStorageObjects: (objectNames: string[]) => Promise<void>,
): Promise<AssetStorageObject[] | null> =>
  db.tx(async (transaction) => {
    const assets = await transaction.manyOrNone<AssetStorageObject>(
      `
        SELECT id, storage_key, thumbnail_key
        FROM assets
        WHERE id = $1 OR parentid = $1
        FOR UPDATE
      `,
      [assetId],
    );

    if (assets.length === 0) return null;

    const objectNames = [
      ...new Set(
        assets.flatMap((asset) =>
          [asset.storage_key, asset.thumbnail_key].filter((key): key is string => Boolean(key)),
        ),
      ),
    ];

    await removeStorageObjects(objectNames);

    const assetIds = assets.map((asset) => asset.id);
    await transaction.none('DELETE FROM assettags WHERE assetid = ANY($1::uuid[])', [assetIds]);
    await transaction.none('DELETE FROM assets WHERE id = ANY($1::uuid[])', [assetIds]);

    return assets;
  });
