import { describe, expect, it } from 'vitest';
import { isAiActionClosed, parseAiActionSegments } from '../../../src/features/messenger/ai-action';

describe('parseAiActionSegments', () => {
  it('returns null without ai-action', () => {
    expect(parseAiActionSegments('hello')).toBeNull();
  });

  it('parses description block with attrs and body', () => {
    const md = `## AI 建议

### 描述建议
:::ai-action{type=description task_id=50 message_id=9}:::
### 目标
完成登录
:::
`;
    const segs = parseAiActionSegments(md);
    expect(segs).not.toBeNull();
    const action = segs!.find((s) => s.kind === 'action');
    expect(action?.kind).toBe('action');
    if (action?.kind !== 'action') return;
    expect(action.block.attrs).toMatchObject({
      type: 'description',
      taskId: 50,
      messageId: 9,
    });
    expect(action.block.body).toContain('完成登录');
  });

  it('parses assignee with userId and status', () => {
    const md = `:::ai-action{type=assignee task_id=1 message_id=2 userId=10 status=applied}:::
**Ada** — free
:::
`;
    const segs = parseAiActionSegments(md);
    const action = segs?.find((s) => s.kind === 'action');
    expect(action?.kind).toBe('action');
    if (action?.kind !== 'action') return;
    expect(action.block.attrs.userId).toBe(10);
    expect(action.block.attrs.status).toBe('applied');
    expect(isAiActionClosed(action.block.attrs.status)).toBe(true);
  });
});
