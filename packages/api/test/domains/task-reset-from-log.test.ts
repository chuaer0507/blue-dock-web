import { describe, expect, it } from 'vitest';
import { isProjectLogFlowResettable } from '../../src/domains/task';

describe('isProjectLogFlowResettable', () => {
  it('accepts non-empty record.flow object', () => {
    expect(isProjectLogFlowResettable({ flow: { flowItemId: 3 } })).toBe(true);
  });

  it('rejects missing or empty flow', () => {
    expect(isProjectLogFlowResettable(null)).toBe(false);
    expect(isProjectLogFlowResettable({})).toBe(false);
    expect(isProjectLogFlowResettable({ flow: {} })).toBe(false);
    expect(isProjectLogFlowResettable({ flow: [] })).toBe(false);
    expect(isProjectLogFlowResettable({ flow: 'x' })).toBe(false);
  });
});
