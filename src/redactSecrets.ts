const BEARER_RE = /Bearer\s+[A-Za-z0-9._-]+/gi;
const SKIN_ENV_RE = /SKIN_[A-Z0-9_]*=[^\s]+/gi;

/** Strip bearer tokens and SKIN_* env fragments from user-visible error text. */
export function redactSecrets(text: string): string {
  return text
    .replace(BEARER_RE, 'Bearer [REDACTED]')
    .replace(SKIN_ENV_RE, 'SKIN_*=[REDACTED]');
}
