export class SkinApiAuthError extends Error {
  constructor(message = 'Skin API authorization failed') {
    super(message);
    this.name = 'SkinApiAuthError';
  }
}

/**
 * Gate for future protected skin-registry API calls (STO-141).
 * Non-admin tokens must fail before any network I/O.
 */
export function assertSkinApiPermission(token: string | undefined, role: 'admin' | 'member'): void {
  if (!token || token.trim().length === 0) {
    throw new SkinApiAuthError('Missing API token');
  }
  if (role !== 'admin') {
    throw new SkinApiAuthError('Insufficient permissions for this endpoint');
  }
}
