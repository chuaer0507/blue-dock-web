export type ChecklistSegment =
  | { kind: 'text'; value: string }
  | { kind: 'item'; index: number; checked: boolean; label: string };

const LI_RE = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function isCheckedAttr(attrs: string): boolean {
  return /data-list\s*=\s*(["']?)checked\1/i.test(attrs);
}

/** 将含 `<li>` 的正文拆成文本段与清单项（index 对齐契约 `message/checked`） */
export function parseChecklistSegments(text: string): ChecklistSegment[] {
  if (!text || !/<li\b/i.test(text)) {
    return text ? [{ kind: 'text', value: text }] : [];
  }
  const segments: ChecklistSegment[] = [];
  let last = 0;
  let index = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(LI_RE.source, 'gi');
  while ((m = re.exec(text)) != null) {
    if (m.index > last) {
      const chunk = cleanupListScaffold(text.slice(last, m.index));
      if (chunk) segments.push({ kind: 'text', value: chunk });
    }
    segments.push({
      kind: 'item',
      index: index++,
      checked: isCheckedAttr(m[1] ?? ''),
      label: stripTags(m[2] ?? '') || '—',
    });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    const chunk = cleanupListScaffold(text.slice(last));
    if (chunk) segments.push({ kind: 'text', value: chunk });
  }
  return segments;
}

function cleanupListScaffold(raw: string): string {
  return raw
    .replace(/<\/?ul\b[^>]*>/gi, '')
    .replace(/<\/?ol\b[^>]*>/gi, '')
    .trim();
}

export function hasChecklistItems(text: string): boolean {
  return /<li\b/i.test(text);
}

/** 在选区插入一条未勾选清单项（契约 HTML `data-list`） */
export function insertChecklistItem(
  value: string,
  start: number,
  end: number,
  placeholder: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  const selected = safeEnd > safeStart ? value.slice(safeStart, safeEnd) : placeholder;
  const before = '<ul><li data-list="unchecked">';
  const after = '</li></ul>';
  const next = `${value.slice(0, safeStart)}${before}${selected}${after}${value.slice(safeEnd)}`;
  const selectionStart = safeStart + before.length;
  const selectionEnd = selectionStart + selected.length;
  return { value: next, selectionStart, selectionEnd };
}
