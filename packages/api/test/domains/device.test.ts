import { describe, expect, it } from 'vitest';
import { deviceKeys } from '../../src/domains/device';

describe('deviceKeys', () => {
  it('builds list factory', () => {
    expect(deviceKeys.list()).toEqual(['devices', 'list']);
  });
});
