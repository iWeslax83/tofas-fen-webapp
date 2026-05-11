import { describe, expect, it } from 'vitest';
import { shouldEnableTls } from '../../db';

describe('shouldEnableTls', () => {
  const SRV = 'mongodb+srv://user:pass@cluster.mongodb.net/db';
  const PLAIN = 'mongodb://localhost:27017/tofas-fen';

  it('honors explicit MONGODB_TLS=true regardless of scheme or env', () => {
    expect(shouldEnableTls(PLAIN, 'true', 'development')).toBe(true);
    expect(shouldEnableTls(PLAIN, 'true', 'production')).toBe(true);
    expect(shouldEnableTls(SRV, 'true', 'development')).toBe(true);
  });

  it('honors explicit MONGODB_TLS=false even when scheme would imply TLS', () => {
    // Explicit override wins — caller asked for plaintext, give them plaintext.
    // (Driver will then fail against Atlas, which is the desired loud signal.)
    expect(shouldEnableTls(SRV, 'false', 'development')).toBe(false);
    expect(shouldEnableTls(SRV, 'false', 'production')).toBe(false);
    expect(shouldEnableTls(PLAIN, 'false', 'production')).toBe(false);
  });

  it('defaults to TLS for mongodb+srv:// URIs even outside production', () => {
    // This is the bug that hid behind a "MongoServerSelectionError /
    // IP whitelist" red herring: Atlas SRV needs TLS but dev defaulted it off.
    expect(shouldEnableTls(SRV, undefined, 'development')).toBe(true);
    expect(shouldEnableTls(SRV, undefined, 'staging')).toBe(true);
    expect(shouldEnableTls(SRV, '', 'development')).toBe(true);
  });

  it('defaults to TLS in production for plain mongodb:// URIs', () => {
    expect(shouldEnableTls(PLAIN, undefined, 'production')).toBe(true);
  });

  it('defaults to no TLS for plain mongodb:// URIs in non-production', () => {
    // Preserves the local docker-compose mongo case (no certs).
    expect(shouldEnableTls(PLAIN, undefined, 'development')).toBe(false);
    expect(shouldEnableTls(PLAIN, undefined, 'staging')).toBe(false);
    expect(shouldEnableTls(PLAIN, undefined, undefined)).toBe(false);
  });
});
