import { describe, expect, it } from 'vitest';
import { extractQrLoginCode } from '../../../src/features/mobile/qr-code';

describe('extractQrLoginCode', () => {
  const code = 'a'.repeat(32);

  it('accepts raw code', () => {
    expect(extractQrLoginCode(code)).toBe(code);
  });

  it('parses URL query', () => {
    expect(extractQrLoginCode(`https://app.example/login?code=${code}`)).toBe(code);
  });

  it('rejects short strings', () => {
    expect(extractQrLoginCode('short')).toBeNull();
  });
});
