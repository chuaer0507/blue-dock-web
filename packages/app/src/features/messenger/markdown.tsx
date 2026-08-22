import type { ReactNode } from 'react';
import { EXPORT_DOWNLOAD_URL_RE, parseExportDownloadRef } from '@blue-dock/api';
import { ExportDownloadLink } from '../export/ExportDownloadLink';

/** 在选区两侧插入 Markdown 标记（无选区时插入占位词） */
export function wrapTextRange(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  const selected = safeEnd > safeStart ? value.slice(safeStart, safeEnd) : placeholder;
  const next = `${value.slice(0, safeStart)}${before}${selected}${after}${value.slice(safeEnd)}`;
  const selectionStart = safeStart + before.length;
  const selectionEnd = selectionStart + selected.length;
  return { value: next, selectionStart, selectionEnd };
}

type InlineNode =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; href: string; label: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string };

function splitExportUrls(text: string): InlineNode[] {
  if (!text) return [];
  const nodes: InlineNode[] = [];
  const re = new RegExp(EXPORT_DOWNLOAD_URL_RE.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    if (m.index > last) {
      nodes.push({ kind: 'text', value: text.slice(last, m.index) });
    }
    const href = m[0];
    nodes.push({ kind: 'link', href, label: href });
    last = m.index + href.length;
  }
  if (last < text.length) {
    nodes.push({ kind: 'text', value: text.slice(last) });
  }
  return nodes.length ? nodes : [{ kind: 'text', value: text }];
}

/** 安全子集：`code` · [label](url) · **bold** · *italic*（不执行 HTML） */
export function parseInlineMarkdown(text: string): InlineNode[] {
  if (!text) return [];
  const nodes: InlineNode[] = [];
  const re =
    /(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    if (m.index > last) {
      nodes.push(...splitExportUrls(text.slice(last, m.index)));
    }
    if (m[1] != null) {
      nodes.push({ kind: 'code', value: m[2] ?? '' });
    } else if (m[3] != null) {
      nodes.push({ kind: 'link', label: m[4] ?? '', href: m[5] ?? '' });
    } else if (m[6] != null) {
      nodes.push({ kind: 'bold', value: m[7] ?? '' });
    } else if (m[8] != null) {
      nodes.push({ kind: 'italic', value: m[9] ?? '' });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(...splitExportUrls(text.slice(last)));
  }
  return nodes;
}

function renderNodes(nodes: InlineNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-${i}`;
    if (n.kind === 'text') return <span key={key}>{n.value}</span>;
    if (n.kind === 'code') {
      return (
        <code key={key} className="bg-default/60 rounded px-1 py-0.5 font-mono text-[0.85em]">
          {n.value}
        </code>
      );
    }
    if (n.kind === 'link') {
      if (parseExportDownloadRef(n.href)) {
        return (
          <ExportDownloadLink
            key={key}
            href={n.href}
            label={n.label}
            className="underline underline-offset-2"
          />
        );
      }
      return (
        <a
          key={key}
          href={n.href}
          target="_blank"
          rel="noreferrer noopener"
          className="underline underline-offset-2"
        >
          {n.label}
        </a>
      );
    }
    if (n.kind === 'bold') {
      return (
        <strong key={key} className="font-semibold">
          {n.value}
        </strong>
      );
    }
    return (
      <em key={key} className="italic">
        {n.value}
      </em>
    );
  });
}

/** 行内 Markdown → React 节点（换行保留） */
export function renderInlineMarkdown(text: string, keyPrefix = 'md'): ReactNode[] {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  lines.forEach((line, li) => {
    out.push(...renderNodes(parseInlineMarkdown(line), `${keyPrefix}-L${li}`));
    if (li < lines.length - 1) {
      out.push(<br key={`${keyPrefix}-br-${li}`} />);
    }
  });
  return out;
}
