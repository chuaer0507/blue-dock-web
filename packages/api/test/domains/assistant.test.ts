import { describe, expect, it } from 'vitest';
import { flattenAssistantModels } from '../../src/domains/assistant';

describe('flattenAssistantModels', () => {
  it('flattens provider model lists', () => {
    const list = flattenAssistantModels({
      openaiModels: ['gpt-4o-mini'],
      deepseekModels: ['deepseek-chat'],
      embeddingModel: 'text-embedding-3-small',
      openaiModel: 'gpt-4o',
    });
    expect(list.map((m) => m.id).sort()).toEqual(['deepseek-chat', 'gpt-4o', 'gpt-4o-mini']);
  });
});
