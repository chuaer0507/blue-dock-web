/** 解析输入中尚未完成的 `@query`（行尾 / 空白后） */
export function detectMentionTrigger(text: string): { start: number; query: string } | null {
  const re = /(^|[\s\n])@([^\s@]*)$/;
  const m = text.match(re);
  if (!m || m.index == null) return null;
  const at = m.index + m[1].length;
  return { start: at, query: m[2] ?? '' };
}

/** 解析输入中尚未完成的 `#query`（行尾 / 空白后） */
export function detectTaskTrigger(text: string): { start: number; query: string } | null {
  const re = /(^|[\s\n])#([^\s#]*)$/;
  const m = text.match(re);
  if (!m || m.index == null) return null;
  const hash = m.index + m[1].length;
  return { start: hash, query: m[2] ?? '' };
}

/** 将 `@query` / `#query` 替换为提及标记 */
export function insertMentionToken(
  text: string,
  start: number,
  query: string,
  token: string,
): string {
  const end = start + 1 + query.length;
  return `${text.slice(0, start)}${token} ${text.slice(end)}`;
}

export function formatUserMention(userId: number, nickname: string): string {
  const name = nickname.replace(/[\][]/g, '').trim() || String(userId);
  return `[:@:${userId}:${name}:]`;
}

export function formatAllMention(): string {
  return '[:@:0:]';
}

export function formatTaskMention(taskId: number, title: string): string {
  const name = title.replace(/[\][]/g, '').trim() || String(taskId);
  return `[:#:${taskId}:${name}:]`;
}

export type MentionSegment =
  | { kind: 'text'; value: string }
  | { kind: 'user'; name: string }
  | { kind: 'all' }
  | { kind: 'task'; taskId: number; name: string };

const SEGMENT_RE =
  /\[:@:(?:0|all):[^\]]*\]|\[:@:(\d+):([^\]]*):\]|\[:#:(\d+):([^\]]*):\]|<span\s+[^>]*class="[^"]*mention[^"]*"[^>]*>[^<]*<\/span>/gi;

function parseHtmlMention(
  raw: string,
  allLabel: string,
): MentionSegment | { kind: 'text'; value: string } {
  const cls = /class="([^"]*)"/i.exec(raw)?.[1] ?? '';
  const dataId = /data-id="([^"]*)"/i.exec(raw)?.[1] ?? '';
  const inner = />([^<]*)</.exec(raw)?.[1] ?? '';
  if (/\ball\b/i.test(cls) || dataId === 'all' || dataId === '0') {
    return { kind: 'all' };
  }
  if (/\btask\b/i.test(cls)) {
    const taskId = Number(dataId);
    const name = inner.replace(/^#/, '').trim() || (taskId > 0 ? String(taskId) : allLabel);
    return taskId > 0 ? { kind: 'task', taskId, name } : { kind: 'text', value: inner || raw };
  }
  if (/\buser\b/i.test(cls)) {
    const name = inner.replace(/^@/, '').trim() || dataId;
    return { kind: 'user', name };
  }
  return { kind: 'text', value: inner || raw };
}

/** 拆分为可渲染片段（用户 / 所有人 / 任务） */
export function parseMentionSegments(text: string, allLabel: string): MentionSegment[] {
  if (!text) return [];
  const out: MentionSegment[] = [];
  let last = 0;
  const re = new RegExp(SEGMENT_RE.source, SEGMENT_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    if (m.index > last) {
      out.push({ kind: 'text', value: text.slice(last, m.index) });
    }
    const token = m[0];
    if (token.startsWith('<span')) {
      out.push(parseHtmlMention(token, allLabel));
    } else if (/^\[:@:(?:0|all):/i.test(token)) {
      out.push({ kind: 'all' });
    } else if (m[1] != null) {
      out.push({ kind: 'user', name: (m[2] || m[1]).trim() || m[1] });
    } else if (m[3] != null) {
      const taskId = Number(m[3]);
      const name = (m[4] || m[3]).trim() || m[3];
      out.push(taskId > 0 ? { kind: 'task', taskId, name } : { kind: 'text', value: token });
    } else {
      out.push({ kind: 'text', value: token });
    }
    last = m.index + token.length;
  }
  if (last < text.length) {
    out.push({ kind: 'text', value: text.slice(last) });
  }
  return out;
}

/** 展示层：把存储标记还原为可读 @昵称 / #任务名 */
export function formatMentionDisplay(text: string, allLabel: string): string {
  if (!text) return text;
  return parseMentionSegments(text, allLabel)
    .map((s) => {
      if (s.kind === 'text') return s.value;
      if (s.kind === 'all') return `@${allLabel}`;
      if (s.kind === 'user') return `@${s.name}`;
      return `#${s.name}`;
    })
    .join('');
}
