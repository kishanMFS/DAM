import type { Request } from 'express';
import { validationResult, type ValidationChain } from 'express-validator';
import { describe, expect, test } from '@jest/globals';
import {
  validateAssetFiles,
  validateFileId,
  validateLogin,
  validatePresignedFiles,
} from '../src/middleware/requestValidators.js';

const runValidation = async (
  chains: ValidationChain[],
  body: unknown,
  params: Record<string, string> = {},
) => {
  const req = { body, params } as Request;
  await Promise.all(chains.map((chain) => chain.run(req)));
  return validationResult(req);
};

describe('request validators', () => {
  test('rejects a missing presigned files array', async () => {
    const result = await runValidation(validatePresignedFiles, {});

    expect(result.array()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'field',
          path: 'files',
          msg: 'Files must be a non-empty array',
        }),
      ]),
    );
  });

  test('rejects non-object entries in presigned files', async () => {
    const result = await runValidation(validatePresignedFiles, {
      files: [null],
    });

    expect(result.array()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'field',
          msg: 'Each file must be an object',
        }),
      ]),
    );
  });

  test('accepts valid presigned file details', async () => {
    const result = await runValidation(validatePresignedFiles, {
      files: [{ fileName: 'asset.png', mimeType: 'image/png' }],
    });

    expect(result.isEmpty()).toBe(true);
  });

  test('rejects invalid asset metadata and accepts numeric size strings', async () => {
    const invalidResult = await runValidation(validateAssetFiles, {
      files: [{ objectName: '', originalName: '', fileType: 'invalid', size: 0 }],
    });
    expect(invalidResult.isEmpty()).toBe(false);

    const validRequest = {
      body: {
        files: [
          {
            objectName: 'objects/asset.png',
            originalName: 'asset.png',
            fileType: 'image/png',
            size: '1.25',
          },
        ],
      },
      params: {},
    } as Request;
    await Promise.all(validateAssetFiles.map((chain) => chain.run(validRequest)));

    expect(validationResult(validRequest).isEmpty()).toBe(true);
    expect(validRequest.body.files[0].size).toBe(1.25);
  });

  test('validates login credentials and UUID route parameters', async () => {
    const invalidLogin = await runValidation(validateLogin, {
      email: 'not-an-email',
      password: '',
    });
    expect(invalidLogin.isEmpty()).toBe(false);

    const validFileId = await runValidation(
      validateFileId,
      {},
      {
        fileId: '123e4567-e89b-12d3-a456-426614174000',
      },
    );
    expect(validFileId.isEmpty()).toBe(true);
  });
});
