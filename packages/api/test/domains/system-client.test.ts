import { describe, expect, it } from 'vitest';
import {
  parseSystemUpdateLog,
  parseSystemVersion,
  systemClientKeys,
} from '../../src/domains/system-client';

describe('systemClientKeys', () => {
  it('nests version and updateLog', () => {
    expect(systemClientKeys.version()).toEqual(['systemClient', 'version']);
    expect(systemClientKeys.updateLog(20)).toEqual(['systemClient', 'updateLog', 20]);
  });
});

describe('parseSystemVersion', () => {
  it('parses envelope fields', () => {
    expect(
      parseSystemVersion({
        name: 'BlueDock',
        version: '1.2.3',
        publish: [],
        deviceCount: 2,
      }),
    ).toEqual({
      name: 'BlueDock',
      version: '1.2.3',
      publish: [],
      deviceCount: 2,
    });
  });
});

describe('parseSystemUpdateLog', () => {
  it('parses log text', () => {
    expect(parseSystemUpdateLog({ logVersion: '1.0.0', updateLog: '## 1.0.0\n- a' })).toEqual({
      logVersion: '1.0.0',
      updateLog: '## 1.0.0\n- a',
    });
  });
});
