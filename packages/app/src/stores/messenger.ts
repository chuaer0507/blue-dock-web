import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scopedPersistOptions } from './persist';

type MessengerUiPersisted = {
  drafts: Record<string, string>;
  /** 桌面通知用：本地免打扰会话（与 dialog/config isMuted 同步） */
  mutedDialogIds: number[];
};

type MessengerUiState = MessengerUiPersisted & {
  getDraft: (dialogId: number) => string;
  setDraft: (dialogId: number, text: string) => void;
  clearDraft: (dialogId: number) => void;
  isDialogMuted: (dialogId: number) => boolean;
  setDialogMuted: (dialogId: number, muted: boolean) => void;
};

/** 会话草稿 + 免打扰本地镜像（按用户 persist） */
export const useMessengerDraftStore = create<MessengerUiState>()(
  persist(
    (set, get) => ({
      drafts: {},
      mutedDialogIds: [],
      getDraft: (dialogId) => get().drafts[String(dialogId)] ?? '',
      setDraft: (dialogId, text) =>
        set((s) => ({
          drafts: { ...s.drafts, [String(dialogId)]: text },
        })),
      clearDraft: (dialogId) =>
        set((s) => {
          const next = { ...s.drafts };
          delete next[String(dialogId)];
          return { drafts: next };
        }),
      isDialogMuted: (dialogId) => get().mutedDialogIds.includes(dialogId),
      setDialogMuted: (dialogId, muted) =>
        set((s) => {
          const has = s.mutedDialogIds.includes(dialogId);
          if (muted && has) return s;
          if (!muted && !has) return s;
          return {
            mutedDialogIds: muted
              ? [...s.mutedDialogIds, dialogId]
              : s.mutedDialogIds.filter((id) => id !== dialogId),
          };
        }),
    }),
    {
      ...scopedPersistOptions('messenger-ui'),
      partialize: (s): MessengerUiPersisted => ({
        drafts: s.drafts,
        mutedDialogIds: s.mutedDialogIds,
      }),
    },
  ),
);
