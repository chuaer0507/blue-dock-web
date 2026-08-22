import type { TaskView } from '@blue-dock/api';

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** 将当前已加载任务导出为 CSV（UTF-8 BOM，便于 Excel） */
export function downloadTasksCsv(filename: string, tasks: TaskView[]): void {
  const header = [
    'id',
    'name',
    'columnId',
    'priority',
    'completeAt',
    'startAt',
    'endAt',
    'flowItem',
  ];
  const rows = tasks.map((task) =>
    [
      String(task.id),
      task.name ?? '',
      String(task.columnId ?? ''),
      task.priorityName ?? '',
      task.completeAt ?? '',
      task.startAt ?? '',
      task.endAt ?? '',
      task.flowItemName ?? '',
    ]
      .map(csvEscape)
      .join(','),
  );
  const body = `\uFEFF${[header.join(','), ...rows].join('\n')}`;
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
