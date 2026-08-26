import { useEffect, useMemo, useState } from 'react';
import { Button, Label, ListBox, Select, toast } from '@heroui/react';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  projectMemberHasPoint,
  useCreateTask,
  useProjectList,
  useProjectPermission,
  useSearchKind,
  type ProjectView,
  type SearchHitView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { detectTaskTrigger, formatTaskMention, insertMentionToken } from './mention';

type Props = {
  draft: string;
  onChangeDraft: (next: string) => void;
  /** 项目群会话时预填 projectId */
  defaultProjectId?: number;
};

/** 输入 `#` 后搜索任务，或在面板内速建并插入引用 */
export function TaskSuggest({ draft, onChangeDraft, defaultProjectId }: Props) {
  const { t } = useTranslation('messenger');
  const trigger = useMemo(() => detectTaskTrigger(draft), [draft]);
  const [debounced, setDebounced] = useState('');
  const [projectId, setProjectId] = useState('');
  const createTask = useCreateTask();
  const projects = useProjectList({ archived: 'no', type: 'all' });

  useEffect(() => {
    if (!trigger) {
      setDebounced('');
      return;
    }
    const timer = window.setTimeout(() => setDebounced(trigger.query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [trigger]);

  useEffect(() => {
    if (defaultProjectId && defaultProjectId > 0) {
      setProjectId(String(defaultProjectId));
      return;
    }
    if (!trigger) setProjectId('');
  }, [defaultProjectId, trigger]);

  const search = useSearchKind('task', debounced, 12, Boolean(trigger) && debounced.length > 0);
  const hits: SearchHitView[] = search.data ?? [];
  const list = projects.data ?? [];

  const resolvedProjectId = Number(projectId) || defaultProjectId || 0;
  const selected = list.find((p: ProjectView) => p.id === resolvedProjectId);
  const myOwner = selected?.myOwner ?? 0;
  const editOpen = Boolean(selected && !selected.departmentReadonly && !selected.archivedAt);
  const permissionQuery = useProjectPermission(
    resolvedProjectId > 0 ? resolvedProjectId : undefined,
    Boolean(selected) && !selected?.isPersonal && myOwner === 0,
  );
  const canAdd = editOpen && projectMemberHasPoint(myOwner, permissionQuery.data, 'TASK_ADD');

  if (!trigger) return null;

  const apply = (taskId: number, title: string) => {
    onChangeDraft(
      insertMentionToken(draft, trigger.start, trigger.query, formatTaskMention(taskId, title)),
    );
  };

  const createName = debounced || trigger.query.trim();

  const onCreate = () => {
    const name = createName.trim();
    if (!name) {
      toast.danger(t('taskMention.createNeedName'));
      return;
    }
    if (!Number.isFinite(resolvedProjectId) || resolvedProjectId <= 0) {
      toast.danger(t('taskMention.createNeedProject'));
      return;
    }
    if (!canAdd) {
      toast.danger(t('taskMention.createDenied'));
      return;
    }
    createTask.mutate(
      { projectId: resolvedProjectId, name },
      {
        onSuccess: (task) => {
          toast.success(t('taskMention.created'));
          apply(task.id, task.name || name);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const waiting = debounced.length === 0;
  const loading = !waiting && search.isFetching;
  const empty = !waiting && !loading && hits.length === 0;
  const needProjectPick = !(defaultProjectId && defaultProjectId > 0);

  return (
    <div
      className={cn(
        'border-border bg-surface absolute inset-x-0 bottom-full z-20 mb-1 max-h-64 overflow-auto rounded-lg border shadow-md',
      )}
      role="listbox"
      aria-label={t('taskMention.title')}
    >
      {waiting ? <p className="text-muted px-3 py-2 text-xs">{t('taskMention.hint')}</p> : null}
      {loading ? <p className="text-muted px-3 py-2 text-xs">{t('loading')}</p> : null}
      {empty ? <p className="text-muted px-3 py-2 text-xs">{t('taskMention.empty')}</p> : null}
      <ul className="py-1">
        {hits.map((hit) => (
          <li key={hit.id}>
            <Button
              size="sm"
              variant="ghost"
              className="h-auto w-full justify-start px-3 py-1.5 text-left text-sm font-normal"
              onPress={() => apply(hit.id, hit.title || String(hit.id))}
            >
              <span className="truncate">
                <span className="text-muted mr-1">#{hit.id}</span>
                {hit.title || t('taskMention.untitled')}
              </span>
            </Button>
          </li>
        ))}
      </ul>
      {createName ? (
        <div className="border-border flex flex-col gap-2 border-t px-3 py-2">
          {needProjectPick ? (
            <Select
              className="w-full"
              value={projectId || undefined}
              onChange={(key) => setProjectId(String(key ?? ''))}
              isDisabled={projects.isLoading || list.length === 0}
              aria-label={t('taskMention.createProject')}
            >
              <Label>{t('taskMention.createProject')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {list.map((p: ProjectView) => (
                    <ListBox.Item key={p.id} id={String(p.id)} textValue={p.name}>
                      {p.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ) : null}
          {resolvedProjectId > 0 && !canAdd && !permissionQuery.isLoading ? (
            <p className="text-danger text-xs">{t('taskMention.createDenied')}</p>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            className="justify-start"
            isDisabled={
              createTask.isPending ||
              (needProjectPick && list.length === 0) ||
              (resolvedProjectId > 0 && !canAdd) ||
              permissionQuery.isLoading
            }
            onPress={onCreate}
          >
            {createTask.isPending
              ? t('taskMention.creating')
              : t('taskMention.create', { name: createName })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
