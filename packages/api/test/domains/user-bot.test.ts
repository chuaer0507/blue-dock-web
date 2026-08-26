import { describe, expect, it } from 'vitest';
import { toUserBotView } from '../../src/domains/user-bot';

describe('toUserBotView', () => {
  it('保留后端字符串化的超大机器人 ID', () => {
    const bot = toUserBotView({ id: '350905970450370560', name: '机器人' });

    expect(bot.id).toBe('350905970450370560');
  });

  it('为缺失字段提供安全默认值', () => {
    expect(toUserBotView({ id: '1' })).toMatchObject({
      id: '1',
      name: '',
      clearDay: 90,
      webhookEvents: ['message'],
    });
  });
});
