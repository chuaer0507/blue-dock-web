import { Link } from 'react-router';
import { renderInlineMarkdown } from './markdown';
import { parseMentionSegments } from './mention';

type Props = {
  text: string;
  allLabel: string;
  className?: string;
};

/** 文本消息内 @ / # 提及可读化 + 行内 Markdown；任务可点开 */
export function MentionedBody({ text, allLabel, className }: Props) {
  const segments = parseMentionSegments(text, allLabel);
  return (
    <p className={className ?? 'wrap-break-word'}>
      {segments.map((s, i) => {
        if (s.kind === 'text') {
          return <span key={i}>{renderInlineMarkdown(s.value, `t${i}`)}</span>;
        }
        if (s.kind === 'all') {
          return (
            <span key={i} className="font-medium">
              @{allLabel}
            </span>
          );
        }
        if (s.kind === 'user') {
          return (
            <span key={i} className="font-medium">
              @{s.name}
            </span>
          );
        }
        return (
          <Link
            key={i}
            to={`/single/task/${s.taskId}`}
            className="font-medium underline underline-offset-2"
          >
            #{s.name}
          </Link>
        );
      })}
    </p>
  );
}
