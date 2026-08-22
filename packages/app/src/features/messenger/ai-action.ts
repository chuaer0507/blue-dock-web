/** 任务群 AI 卡片：`:::ai-action{type=… task_id=… message_id=…}:::` */

export type AiActionAttrs = {
  type: string;
  taskId: number;
  messageId: number;
  userId: number;
  related: number;
  status: string;
};

export type AiActionBlock = {
  attrs: AiActionAttrs;
  body: string;
};

export type AiBodySegment =
  { kind: 'text'; value: string } | { kind: 'action'; block: AiActionBlock };

function parseAttrs(raw: string): AiActionAttrs {
  const map = new Map<string, string>();
  for (const part of raw.trim().split(/\s+/)) {
    if (!part) continue;
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    map.set(part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim());
  }
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = map.get(k.toLowerCase());
      if (v != null && v !== '') return v;
    }
    return '';
  };
  const num = (...keys: string[]) => {
    const n = Number(get(...keys));
    return Number.isFinite(n) ? n : 0;
  };
  return {
    type: get('type'),
    taskId: num('task_id', 'taskId'),
    messageId: num('message_id', 'messageId'),
    userId: num('userId', 'user_id'),
    related: num('related'),
    status: get('status').toLowerCase(),
  };
}

/** 含 `:::ai-action` 时拆成文本段与动作块；否则返回 null */
export function parseAiActionSegments(text: string): AiBodySegment[] | null {
  if (!text || !/:::ai-action\{/i.test(text)) return null;
  const segments: AiBodySegment[] = [];
  let cursor = 0;
  const re = /:::ai-action\{([^}]*)\}:::/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    if (m.index > cursor) {
      const ahead = text.slice(cursor, m.index);
      if (ahead.trim()) segments.push({ kind: 'text', value: ahead });
    }
    const attrs = parseAttrs(m[1] ?? '');
    let pos = m.index + m[0].length;
    if (text[pos] === '\n') pos += 1;
    const rest = text.slice(pos);
    const closeIdx = rest.search(/\n:::(?:\s*\n|$)/);
    const nextOpenIdx = rest.search(/:::ai-action\{/i);
    let bodyLen = rest.length;
    if (closeIdx >= 0) bodyLen = closeIdx;
    if (nextOpenIdx >= 0 && nextOpenIdx < bodyLen) bodyLen = nextOpenIdx;
    const body = rest.slice(0, bodyLen).replace(/\s+$/, '');
    segments.push({ kind: 'action', block: { attrs, body } });
    cursor = pos + bodyLen;
    if (closeIdx === bodyLen) {
      const closeMatch = rest.slice(closeIdx).match(/^\n:::(?:\s*\n)?/);
      cursor += closeMatch ? closeMatch[0].length : 0;
    }
    re.lastIndex = cursor;
  }
  if (cursor < text.length) {
    const rest = text.slice(cursor);
    if (rest.trim()) segments.push({ kind: 'text', value: rest });
  }
  return segments.length > 0 ? segments : null;
}

export function isAiActionClosed(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'applied' || s === 'dismissed';
}
