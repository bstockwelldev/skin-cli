import { describe, expect, test } from 'vitest';

import { assertSkinApiPermission, SkinApiAuthError } from '../src/apiClient.js';

describe('permission gate', () => {
  test('rejects missing token', () => {
    expect(() => assertSkinApiPermission(undefined, 'admin')).toThrow(SkinApiAuthError);
  });

  test('rejects non-admin role even with token', () => {
    expect(() => assertSkinApiPermission('Bearer test-token', 'member')).toThrow(
      /Insufficient permissions/i,
    );
  });

  test('allows admin token', () => {
    expect(() => assertSkinApiPermission('admin-token', 'admin')).not.toThrow();
  });
});
