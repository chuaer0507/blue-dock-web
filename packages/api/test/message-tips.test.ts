import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  setMessageTipsHandler,
  showFailTips,
  showSuccessTips,
  showTransportFailTips,
} from '../src/errors/message-tips';

describe('MessageTips', () => {
  afterEach(() => {
    setMessageTipsHandler(null);
  });

  it('showSuccessTips respects showSuccessTips flag', () => {
    const handler = vi.fn();
    setMessageTipsHandler(handler);
    showSuccessTips({ message: 'saved', tipsType: 'showToast' }, { showSuccessTips: false });
    expect(handler).not.toHaveBeenCalled();
    showSuccessTips({ message: 'saved', tipsType: 'showDialog' }, { showSuccessTips: true });
    expect(handler).toHaveBeenCalledWith({
      message: 'saved',
      tipsType: 'showDialog',
      success: true,
    });
  });

  it('showFailTips skips when showFailTips false', () => {
    const handler = vi.fn();
    setMessageTipsHandler(handler);
    const shown = showFailTips(
      { message: 'auth.failed', tipsType: 'showToast' },
      { showFailTips: false },
    );
    expect(shown).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('showFailTips uses envelope tipsType when enabled', () => {
    const handler = vi.fn();
    setMessageTipsHandler(handler);
    expect(
      showFailTips(
        {
          message: 'key bad',
          tipsType: 'showToast',
        },
        { showFailTips: true },
      ),
    ).toBe(true);
    expect(handler).toHaveBeenCalledWith({
      message: 'key bad',
      tipsType: 'showToast',
      success: false,
    });
  });

  it('showTransportFailTips uses toast style', () => {
    const handler = vi.fn();
    setMessageTipsHandler(handler);
    expect(showTransportFailTips('E404 - x', undefined)).toBe(true);
    expect(handler).toHaveBeenCalledWith({
      message: 'E404 - x',
      tipsType: 'showToast',
      success: false,
    });
  });
});
