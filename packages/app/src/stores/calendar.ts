import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { scopedPersistOptions } from './persist';

export type CalendarViewMode = 'month' | 'week' | 'day';

type CalendarUiPersisted = {
  view: CalendarViewMode;
};

type CalendarUiState = CalendarUiPersisted & {
  setView: (v: CalendarViewMode) => void;
};

/** 日历壳层偏好（视图类型），按用户 persist */
export const useCalendarUiStore = create<CalendarUiState>()(
  persist(
    (set) => ({
      view: 'month',
      setView: (view) => set({ view }),
    }),
    {
      ...scopedPersistOptions('calendar-ui'),
      partialize: (s): CalendarUiPersisted => ({ view: s.view }),
    },
  ),
);
