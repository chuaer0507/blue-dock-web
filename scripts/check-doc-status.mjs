/* global URL, console, process */

import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const failures = [];

const checklist = read('docs/guide/sync-checklist.md');
if (/^\|.*\|\s*(?:pending|shell|wip)\s*(?:\||$)/im.test(checklist)) {
  failures.push('sync-checklist.md 仍包含未完成状态。');
}

const routing = read('docs/guide/routing.md');
if (/^\|.*\|\s*wip\s*\|/im.test(routing) || /\(wip\)/i.test(routing)) {
  failures.push('routing.md 与完成清单的状态不一致。');
}

for (const path of [
  'docs/navigation/dashboard.md',
  'docs/navigation/file.md',
  'docs/navigation/messenger.md',
  'docs/navigation/calendar.md',
  'docs/collaboration/project.md',
  'docs/collaboration/task.md',
]) {
  if (!/前端状态：done/.test(read(path))) {
    failures.push(`${path} 未标记为 done。`);
  }
}

if (failures.length > 0) {
  console.error(['文档状态校验失败：', ...failures.map((item) => `- ${item}`)].join('\n'));
  process.exitCode = 1;
} else {
  console.info('文档状态校验通过。');
}
