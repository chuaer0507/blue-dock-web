import { describe, expect, it } from 'vitest';
import { appPushKeys } from '../../src/domains/app-push';

describe('appPushKeys', () => {
  it('builds alias factory', () => {
    expect(appPushKeys.alias()).toEqual(['appPush', 'alias']);
  });
});
