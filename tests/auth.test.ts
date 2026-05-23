import { describe, expect, test } from 'vitest';

import { redactSecrets } from '../src/redactSecrets.js';

describe('auth redaction', () => {
  test('redacts bearer tokens from error text', () => {
    const input = 'Request failed: Bearer sk-live-abc123xyz';
    expect(redactSecrets(input)).toBe('Request failed: Bearer [REDACTED]');
    expect(redactSecrets(input)).not.toContain('sk-live');
  });

  test('redacts SKIN_* env fragments', () => {
    const input = 'Config SKIN_API_TOKEN=supersecret failed';
    expect(redactSecrets(input)).toBe('Config SKIN_*=[REDACTED] failed');
    expect(redactSecrets(input)).not.toContain('supersecret');
  });
});
