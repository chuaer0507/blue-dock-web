import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Calendar,
  Checkbox,
  DateField,
  DatePicker,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
  TimeField,
  toast,
  type TimeValue,
} from '@heroui/react';
import {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpTrayIcon,
  ArrowUpCircleIcon,
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { CalendarDateTime, type DateValue } from '@internationalized/date';
import {
  cancelUpload,
  formatFileSize,
  useAddSubtask,
  useArchiveTask,
  useChangeTaskFlow,
  isProjectLogFlowResettable,
  useResetTaskFromLog,
  useCopyTask,
  useDeleteTaskFile,
  useDeleteTaskRelated,
  useDownloadTaskFile,
  useEnsureTaskDialog,
  useFavoriteCheck,
  useMoveTask,
  useProject,
  useProjectColumns,
  useProjectList,
  useProjectLogs,
  useProjectMembers,
  useProjectTagList,
  useRemoveTask,
  useSaveTaskTemplate,
  useDeleteTaskTemplate,
  useToggleTaskTemplateDefault,
  useSortTaskTemplates,
  useSearchKind,
  useAddTaskRelated,
  useTask,
  useTaskAiGenerate,
  useTaskContent,
  useTaskContentHistory,
  useTaskFiles,
  useTaskFlow,
  useTaskPriorities,
  useTaskRelated,
  useTaskSubtasks,
  useTaskTemplateList,
  useTaskTemplateSearch,
  useTaskTemplateVisible,
  useToggleFavorite,
  useSaveTaskBrowse,
  useUpdateTask,
  useUpgradeTask,
  useUploadTaskFile,
  useCurrentUser,
  useProjectPermission,
  projectAllowsPoint,
  type ProjectColumnView,
  type ProjectMemberHit,
  type ProjectTagView,
  type ProjectLogView,
  type ProjectView,
  type SearchHitView,
  type TaskContentHistoryItem,
  type TaskFileView,
  type TaskFlowTurn,
  type TaskPriorityItem,
  type TaskRelatedItem,
  type TaskTemplateView,
  type TaskView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { toLocalDateTime } from '../calendar/date-utils';
import { TaskScheduleConflicts } from './TaskScheduleConflicts';
import { cn } from '../../utils/cn';
import { openAppPath } from '../../utils/open-app-path';
import { TaskSendToChatModal } from './TaskSendToChatModal';

function toDateValue(iso: string | null): DateValue | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new CalendarDateTime(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
  );
}

function fromDateValue(value: DateValue | null): string | null {
  if (!value) return null;
  const hour = 'hour' in value ? Number(value.hour) : 0;
  const minute = 'minute' in value ? Number(value.minute) : 0;
  const second = 'second' in value ? Number(value.second) : 0;
  return toLocalDateTime(new Date(value.year, value.month - 1, value.day, hour, minute, second));
}

function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  const ta = a ? new Date(a).getTime() : null;
  const tb = b ? new Date(b).getTime() : null;
  if (ta == null && tb == null) return true;
  if (ta == null || tb == null) return false;
  if (Number.isNaN(ta) || Number.isNaN(tb)) return (a ?? '') === (b ?? '');
  return Math.abs(ta - tb) < 60_000;
}

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((id, i) => id === right[i]);
}

const MAX_TASK_TAGS = 10;
const MAX_TASK_ASSIGNEES = 10;
const COLOR_PRESETS = ['', '#909399', '#409EFF', '#E6A23C', '#67C23A', '#F56C6C', '#9B59B6'];

function memberLabel(m: ProjectMemberHit): string {
  const name = m.nickname.trim() || m.email.trim();
  return name || String(m.userId);
}

function TaskDatePicker({
  name,
  label,
  value,
  onChange,
  isDisabled,
}: {
  name: string;
  label: ReactNode;
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  isDisabled?: boolean;
}) {
  return (
    <DatePicker
      name={name}
      value={value}
      onChange={onChange}
      granularity="minute"
      hourCycle={24}
      hideTimeZone
      className="w-full"
      isDisabled={isDisabled}
    >
      {({ state }) => (
        <>
          <Label>{label}</Label>
          <DateField.Group fullWidth>
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger>
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DatePicker.Popover className="flex flex-col gap-3 p-3">
            <Calendar aria-label={typeof label === 'string' ? label : name}>
              <Calendar.Header>
                <Calendar.YearPickerTrigger>
                  <Calendar.YearPickerTriggerHeading />
                  <Calendar.YearPickerTriggerIndicator />
                </Calendar.YearPickerTrigger>
                <Calendar.NavButton slot="previous" />
                <Calendar.NavButton slot="next" />
              </Calendar.Header>
              <Calendar.Grid>
                <Calendar.GridHeader>
                  {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                </Calendar.GridHeader>
                <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
              </Calendar.Grid>
              <Calendar.YearPickerGrid>
                <Calendar.YearPickerGridBody>
                  {({ year }) => <Calendar.YearPickerCell year={year} />}
                </Calendar.YearPickerGridBody>
              </Calendar.YearPickerGrid>
            </Calendar>
            <div className="flex items-center justify-end">
              <TimeField
                aria-label={typeof label === 'string' ? label : name}
                granularity="minute"
                hourCycle={24}
                hideTimeZone
                value={state.timeValue}
                onChange={(v) => state.setTimeValue(v as TimeValue)}
              >
                <TimeField.Group variant="secondary">
                  <TimeField.Input>
                    {(segment) => <TimeField.Segment segment={segment} />}
                  </TimeField.Input>
                </TimeField.Group>
              </TimeField>
            </div>
          </DatePicker.Popover>
        </>
      )}
    </DatePicker>
  );
}

export type TaskDetailProps = {
  taskId: number;
  /** page：独立窗全页；modal：项目内弹层 */
  variant: 'page' | 'modal';
  onClose: () => void;
  /** 打开另一任务（子任务）；modal 内切换，page 默认路由跳转 */
  onOpenTask?: (taskId: number) => void;
};

/** 任务详情主体：独立窗与项目 Modal 共用 */
export function TaskDetail({ taskId, variant, onClose, onOpenTask }: TaskDetailProps) {
  const { t } = useTranslation('task');
  const navigate = useNavigate();

  const taskQuery = useTask(taskId);
  const flowQuery = useTaskFlow(taskId);
  const subtasksQuery = useTaskSubtasks(taskId);
  const filesQuery = useTaskFiles(taskId);
  const relatedQuery = useTaskRelated(taskId);
  const logsQuery = useProjectLogs({ taskId, pageSize: 40, enabled: Boolean(taskId) });
  const updateTask = useUpdateTask();
  const changeFlow = useChangeTaskFlow();
  const resetFromLog = useResetTaskFromLog();
  const addSubtask = useAddSubtask();
  const archiveTask = useArchiveTask();
  const removeTask = useRemoveTask();
  const upgradeTask = useUpgradeTask();
  const copyTask = useCopyTask();
  const moveTask = useMoveTask();
  const addRelated = useAddTaskRelated();
  const deleteRelated = useDeleteTaskRelated();
  const deleteFile = useDeleteTaskFile();
  const downloadFile = useDownloadTaskFile();
  const aiGenerate = useTaskAiGenerate();
  const uploadFile = useUploadTaskFile();
  const favoriteCheck = useFavoriteCheck('task', taskId, Boolean(taskId));
  const toggleFavorite = useToggleFavorite();
  const { mutate: saveTaskBrowse } = useSaveTaskBrowse();
  const ensureDialog = useEnsureTaskDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const uploadIdRef = useRef<string | null>(null);

  const task = taskQuery.data;
  const isMainTask = Boolean(task && !(task.parentId > 0));
  const templates = useTaskTemplateList(task?.projectId, Boolean(task?.projectId));
  const saveTemplate = useSaveTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();
  const toggleTemplateDefault = useToggleTaskTemplateDefault();
  const sortTemplates = useSortTaskTemplates();
  const projectQuery = useProject(task?.projectId, Boolean(task?.projectId));
  const canManageTemplates = (projectQuery.data?.myOwner ?? 0) >= 1;
  const me = useCurrentUser();
  const myUserId = me.data?.userId ?? 0;
  const myOwner = projectQuery.data?.myOwner ?? 0;
  const editEnabled = Boolean(
    projectQuery.data && !projectQuery.data.departmentReadonly && !projectQuery.data.archivedAt,
  );
  const permissionQuery = useProjectPermission(
    task?.projectId,
    Boolean(task?.projectId) && !projectQuery.data?.isPersonal && myOwner === 0,
  );
  const taskRoles = {
    isTaskLeader: myUserId > 0 && (task?.ownerUserIds ?? []).includes(myUserId),
    isTaskAssist: myUserId > 0 && (task?.assistUserIds ?? []).includes(myUserId),
  };
  const allows = (point: string) =>
    editEnabled && projectAllowsPoint(myOwner, permissionQuery.data, point, taskRoles);
  const canUpdate = allows('TASK_UPDATE');
  const canTime = allows('TASK_TIME');
  const canStatus = allows('TASK_STATUS');
  const canRemove = allows('TASK_REMOVE');
  const canArchive = allows('TASK_ARCHIVED');
  const canMove = allows('TASK_MOVE');
  const canAddTask = allows('TASK_ADD');
  const [templateQuery, setTemplateQuery] = useState('');
  const [templateSearchDebounced, setTemplateSearchDebounced] = useState('');
  const projectTags = useProjectTagList(task?.projectId, Boolean(task?.projectId));
  const priorities = useTaskPriorities(Boolean(taskId));
  const membersQuery = useProjectMembers(task?.projectId, 1, Boolean(task?.projectId));
  const projectList = useProjectList({ archived: 'no', type: 'all' }, undefined);
  const [moveProjectId, setMoveProjectId] = useState('');
  const [moveColumnId, setMoveColumnId] = useState('');
  const moveColumns = useProjectColumns(Number(moveProjectId) || undefined, undefined);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [contentBaseline, setContentBaseline] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [viewHistoryId, setViewHistoryId] = useState<number | null>(null);
  const [startAt, setStartAt] = useState<DateValue | null>(null);
  const [endAt, setEndAt] = useState<DateValue | null>(null);
  const [loop, setLoop] = useState('0');
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [ownerUserIds, setOwnerUserIds] = useState<number[]>([]);
  const [assistUserIds, setAssistUserIds] = useState<number[]>([]);
  const [color, setColor] = useState('');
  const [priorityKey, setPriorityKey] = useState('0');
  const [visibility, setVisibility] = useState('1');
  const [visibilityUserIds, setVisibilityUserIds] = useState<number[]>([]);
  const [subtaskName, setSubtaskName] = useState('');
  const [relatedTaskIdText, setRelatedTaskIdText] = useState('');
  const [relatedSearchDebounced, setRelatedSearchDebounced] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const contentQuery = useTaskContent(isMainTask ? taskId : undefined, viewHistoryId, isMainTask);
  const historyQuery = useTaskContentHistory(
    isMainTask ? taskId : undefined,
    historyPage,
    20,
    isMainTask,
  );

  useEffect(() => {
    setHistoryPage(1);
    setViewHistoryId(null);
    setContent('');
    setContentBaseline('');
  }, [taskId]);

  /** 详情打开时显式记浏览（Query 缓存命中时 one 不会再写 recent） */
  useEffect(() => {
    if (taskId <= 0 || !taskQuery.isSuccess) return;
    saveTaskBrowse(taskId);
  }, [taskId, taskQuery.isSuccess, saveTaskBrowse]);

  useEffect(() => {
    if (!task) return;
    setName(task.name);
    setDescription(task.description ?? '');
    setStartAt(toDateValue(task.startAt));
    setEndAt(toDateValue(task.endAt));
    setLoop(String(task.loop ?? 0));
    setTagIds(task.tagIds ?? []);
    setOwnerUserIds(task.ownerUserIds ?? []);
    setAssistUserIds(task.assistUserIds ?? []);
    setColor(task.color ?? '');
    setPriorityKey(task.priorityLevel > 0 ? String(task.priorityLevel) : '0');
    setVisibility(String(task.visibility || 1));
    setVisibilityUserIds(task.visibilityUserIds ?? []);
    setMoveProjectId(String(task.projectId));
    setMoveColumnId(String(task.columnId));
  }, [task]);

  useEffect(() => {
    if (!isMainTask || contentQuery.isPending) return;
    const next = contentQuery.data?.content ?? '';
    setContent(next);
    setContentBaseline(next);
  }, [isMainTask, contentQuery.data, contentQuery.isPending, viewHistoryId]);

  useEffect(() => {
    const q = relatedTaskIdText.trim();
    // 纯数字按 ID 添加，不搜
    if (!q || /^\d+$/.test(q)) {
      setRelatedSearchDebounced('');
      return;
    }
    const timer = window.setTimeout(() => setRelatedSearchDebounced(q), 200);
    return () => window.clearTimeout(timer);
  }, [relatedTaskIdText]);

  useEffect(() => {
    const q = templateQuery.trim();
    const timer = window.setTimeout(() => setTemplateSearchDebounced(q), 200);
    return () => window.clearTimeout(timer);
  }, [templateQuery]);

  const relatedSearch = useSearchKind(
    'task',
    relatedSearchDebounced,
    8,
    relatedSearchDebounced.length > 0,
  );
  const relatedHits = (relatedSearch.data ?? []).filter(
    (h: SearchHitView) =>
      h.id !== taskId && !(relatedQuery.data?.items ?? []).some((i) => i.relatedTaskId === h.id),
  );

  const templateVisible = useTaskTemplateVisible(task?.projectId, Boolean(task?.projectId));
  const templateSearch = useTaskTemplateSearch(
    templateSearchDebounced,
    task?.projectId,
    1,
    Boolean(task?.projectId) && templateSearchDebounced.length > 0,
  );
  const localTemplateIds = new Set((templates.data ?? []).map((t) => t.id));
  const sharedTemplates = (
    templateSearchDebounced ? (templateSearch.data?.items ?? []) : (templateVisible.data ?? [])
  ).filter((tpl) => !localTemplateIds.has(tpl.id));

  useEffect(() => {
    const cols = moveColumns.data ?? [];
    if (cols.length === 0) return;
    const current = Number(moveColumnId);
    if (cols.some((c: ProjectColumnView) => c.id === current)) return;
    setMoveColumnId(String(cols[0]!.id));
  }, [moveColumns.data, moveColumnId]);

  const nextStart = fromDateValue(startAt);
  const nextEnd = fromDateValue(endAt);
  const nextLoop = Number(loop) || 0;
  const nextVisibility = Number(visibility) || 1;
  const nextPriorityLevel = Number(priorityKey) || 0;
  const selectedPriority = (priorities.data ?? []).find(
    (p: TaskPriorityItem) => p.priority === nextPriorityLevel,
  );
  const contentDirty = isMainTask && content !== contentBaseline;

  const projectMembers = membersQuery.data?.list ?? [];
  const knownMemberIds = new Set(projectMembers.map((m: ProjectMemberHit) => m.userId));
  const orphanMemberIds = [
    ...new Set([...ownerUserIds, ...assistUserIds, ...visibilityUserIds]),
  ].filter((id) => id > 0 && !knownMemberIds.has(id));
  const memberCandidates: ProjectMemberHit[] = Array.from(
    new Map(
      [
        ...projectMembers,
        ...orphanMemberIds.map((userId) => ({
          userId,
          email: '',
          nickname: '',
          profession: '',
          userImage: '',
        })),
      ].map((member) => [String(member.userId), member]),
    ).values(),
  );

  const timeDirty =
    Boolean(task) && (!sameInstant(nextStart, task?.startAt) || !sameInstant(nextEnd, task?.endAt));
  const fieldsDirty =
    Boolean(task) &&
    (name.trim() !== (task?.name ?? '') ||
      description !== (task?.description ?? '') ||
      contentDirty ||
      nextLoop !== (task?.loop ?? 0) ||
      !sameIdSet(tagIds, task?.tagIds ?? []) ||
      !sameIdSet(ownerUserIds, task?.ownerUserIds ?? []) ||
      (isMainTask && !sameIdSet(assistUserIds, task?.assistUserIds ?? [])) ||
      (color || '') !== (task?.color ?? '') ||
      nextPriorityLevel !== (task?.priorityLevel ?? 0) ||
      nextVisibility !== (task?.visibility ?? 1) ||
      (isMainTask &&
        nextVisibility === 3 &&
        !sameIdSet(visibilityUserIds, task?.visibilityUserIds ?? [])));
  const dirty = (fieldsDirty && canUpdate) || (timeDirty && canTime);

  const openOtherTask = (id: number) => {
    if (onOpenTask) {
      onOpenTask(id);
      return;
    }
    navigate(`/single/task/${id}`);
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    if (fieldsDirty && !canUpdate) return;
    if (timeDirty && !canTime) return;
    if (isMainTask && nextLoop > 0 && !nextEnd) {
      toast.danger(t('loop.needEndAt'));
      return;
    }
    if (canUpdate && ownerUserIds.length === 0) {
      toast.danger(t('assignees.ownerRequired'));
      return;
    }
    const ownersDirty = !sameIdSet(ownerUserIds, task?.ownerUserIds ?? []);
    const assistsDirty = isMainTask && !sameIdSet(assistUserIds, task?.assistUserIds ?? []);
    updateTask.mutate(
      {
        taskId,
        projectId: task?.projectId,
        ...(canUpdate
          ? {
              name: name.trim(),
              description,
              ...(isMainTask ? { loop: nextLoop } : {}),
              ...(contentDirty ? { content } : {}),
              ...(!sameIdSet(tagIds, task?.tagIds ?? []) ? { tagIds } : {}),
              ...(ownersDirty ? { owner: ownerUserIds.join(',') } : {}),
              ...(assistsDirty ? { assist: assistUserIds.join(',') } : {}),
              ...((color || '') !== (task?.color ?? '') ? { color } : {}),
              ...(nextPriorityLevel !== (task?.priorityLevel ?? 0)
                ? {
                    priorityLevel: nextPriorityLevel,
                    priorityName: selectedPriority?.name ?? '',
                    priorityColor: selectedPriority?.color ?? '',
                  }
                : {}),
              ...(isMainTask && nextVisibility !== (task?.visibility ?? 1)
                ? { visibility: nextVisibility }
                : {}),
              ...(isMainTask &&
              nextVisibility === 3 &&
              !sameIdSet(visibilityUserIds, task?.visibilityUserIds ?? [])
                ? { visibility: 3, visibilityUserIds }
                : {}),
            }
          : {}),
        ...(canTime
          ? {
              startAt: nextStart,
              endAt: nextEnd,
            }
          : {}),
      },
      {
        onSuccess: () => {
          if (contentDirty) {
            setViewHistoryId(null);
            setContentBaseline(content);
          }
          toast.success(t('saved'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onToggleComplete = () => {
    if (!task || !canStatus) return;
    const next: 0 | 1 = task.completeAt ? 0 : 1;
    updateTask.mutate(
      { taskId, projectId: task.projectId, complete: next },
      {
        onSuccess: () => toast.success(t('saved')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) {
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'e') return;
      if (!task || updateTask.isPending || !canStatus) return;
      e.preventDefault();
      const next: 0 | 1 = task.completeAt ? 0 : 1;
      updateTask.mutate(
        { taskId, projectId: task.projectId, complete: next },
        {
          onSuccess: () => toast.success(t('saved')),
          onError: (err) => toastRequestError(err, t('error')),
        },
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, task, taskId, updateTask, t, canStatus]);

  const onAddSubtask = (e: FormEvent) => {
    e.preventDefault();
    if (!canAddTask || !subtaskName.trim()) return;
    addSubtask.mutate(
      { taskId, name: subtaskName.trim() },
      {
        onSuccess: () => {
          setSubtaskName('');
          toast.success(t('saved'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const linkRelated = (relatedTaskId: number) => {
    if (!canUpdate) return;
    if (!Number.isFinite(relatedTaskId) || relatedTaskId <= 0) {
      toast.danger(t('related.invalidId'));
      return;
    }
    if (relatedTaskId === taskId) {
      toast.danger(t('related.self'));
      return;
    }
    addRelated.mutate(
      { taskId, relatedTaskId },
      {
        onSuccess: () => {
          setRelatedTaskIdText('');
          setRelatedSearchDebounced('');
          toast.success(t('related.added'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onAddRelated = (e: FormEvent) => {
    e.preventDefault();
    const relatedTaskId = Number(relatedTaskIdText.trim());
    linkRelated(relatedTaskId);
  };

  const onRemoveRelated = (relatedTaskId: number) => {
    if (!canUpdate) return;
    if (!window.confirm(t('related.removeConfirm'))) return;
    deleteRelated.mutate(
      { taskId, relatedTaskId },
      {
        onSuccess: () => toast.success(t('related.removed')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onUpgrade = () => {
    if (!task || isMainTask || !canUpdate) return;
    if (!window.confirm(t('upgrade.confirm'))) return;
    upgradeTask.mutate(
      { taskId, parentId: task.parentId },
      {
        onSuccess: () => toast.success(t('upgrade.ok')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onArchive = () => {
    if (!canArchive) return;
    if (!window.confirm(t('archiveConfirm'))) return;
    archiveTask.mutate(
      { taskId },
      {
        onSuccess: () => {
          toast.success(t('archive'));
          onClose();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onRemove = () => {
    if (!task || !canRemove) return;
    if (!window.confirm(t('remove.confirm'))) return;
    removeTask.mutate(
      { taskId, projectId: task.projectId, parentId: task.parentId },
      {
        onSuccess: () => {
          toast.success(t('remove.ok'));
          onClose();
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDownloadFile = (file: TaskFileView) => {
    downloadFile.mutate(
      { fileId: file.id, taskId },
      {
        onSuccess: (data) => {
          const url = data.url.trim();
          if (!url) {
            toast.danger(t('files.downloadFail'));
            return;
          }
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDeleteFile = (file: TaskFileView) => {
    if (!canUpdate) return;
    if (!window.confirm(t('files.deleteConfirm', { name: file.name }))) return;
    deleteFile.mutate(
      { fileId: file.id, taskId },
      {
        onSuccess: () => toast.success(t('files.deleted')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onCopy = () => {
    if (!task || !canAddTask) return;
    copyTask.mutate(
      {
        taskId,
        projectId: task.projectId,
        columnId: task.columnId,
      },
      {
        onSuccess: (created) => {
          toast.success(t('copy.ok'));
          openOtherTask(created.id);
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onMove = () => {
    if (!task || !isMainTask || !canMove) return;
    const projectId = Number(moveProjectId);
    const columnId = Number(moveColumnId);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      toast.danger(t('move.needProject'));
      return;
    }
    if (!Number.isFinite(columnId) || columnId <= 0) {
      toast.danger(t('move.needColumn'));
      return;
    }
    if (projectId === task.projectId && columnId === task.columnId) {
      toast.danger(t('move.unchanged'));
      return;
    }
    const cross = projectId !== task.projectId;
    if (cross && !window.confirm(t('move.confirmCross'))) return;
    moveTask.mutate(
      {
        taskId,
        projectId,
        columnId,
        fromProjectId: task.projectId,
      },
      {
        onSuccess: () => toast.success(t('move.ok')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onAiGenerate = () => {
    if (!isMainTask || !canUpdate) return;
    aiGenerate.mutate(taskId, {
      onSuccess: (data) => {
        const n = data.suggestions?.length ?? 0;
        toast.success(n > 0 ? t('ai.generated', { count: n }) : t('ai.none'));
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onApplyTemplate = (tpl: TaskTemplateView) => {
    if (!canUpdate) return;
    setName((tpl.title || tpl.name || '').trim() || name);
    setDescription(tpl.content ?? '');
    toast.success(t('template.applied'));
  };

  const onSaveAsTemplate = () => {
    if (!task) return;
    const tplName = name.trim() || task.name;
    if (!tplName) {
      toast.danger(t('template.needName'));
      return;
    }
    saveTemplate.mutate(
      {
        projectId: task.projectId,
        name: tplName,
        title: tplName,
        content: description,
      },
      {
        onSuccess: () => toast.success(t('template.saved')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onDeleteTemplate = (tpl: TaskTemplateView) => {
    if (!task) return;
    if (
      !window.confirm(t('template.deleteConfirm', { name: tpl.name || tpl.title || `#${tpl.id}` }))
    ) {
      return;
    }
    deleteTemplate.mutate(
      { id: tpl.id, projectId: task.projectId },
      {
        onSuccess: () => toast.success(t('template.deleted')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onToggleTemplateDefault = (tpl: TaskTemplateView) => {
    if (!task) return;
    toggleTemplateDefault.mutate(
      { id: tpl.id, projectId: task.projectId },
      {
        onSuccess: (data) =>
          toast.success(data.isDefault === 1 ? t('template.defaultOn') : t('template.defaultOff')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onMoveTemplate = (tplId: number, direction: -1 | 1) => {
    if (!task) return;
    const list = templates.data ?? [];
    const idx = list.findIndex((x) => x.id === tplId);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const next = list.map((x) => x.id);
    const tmp = next[idx]!;
    next[idx] = next[swap]!;
    next[swap] = tmp;
    sortTemplates.mutate(
      { projectId: task.projectId, list: next },
      {
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onToggleFavorite = () => {
    const was = Boolean(favoriteCheck.data?.favorited);
    toggleFavorite.mutate(
      { type: 'task', id: taskId },
      {
        onSuccess: () => toast.success(was ? t('unfavorited') : t('favorited')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onOpenDialog = () => {
    if (task?.dialogId && task.dialogId > 0) {
      onClose();
      navigate(`/manage/messenger/${task.dialogId}`);
      return;
    }
    ensureDialog.mutate(taskId, {
      onSuccess: (updated) => {
        const id = updated.dialogId;
        if (id && id > 0) {
          toast.success(t('dialog.opened'));
          onClose();
          navigate(`/manage/messenger/${id}`);
          return;
        }
        toast.danger(t('error'));
      },
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onPopout = () => {
    onClose();
    openAppPath(`/single/task/${taskId}`, { width: 720, height: 900 });
  };

  const onUploadAttachment = (files: FileList | null) => {
    if (!canUpdate) return;
    const file = files?.[0];
    if (!file) return;
    uploadAbortRef.current?.abort();
    const ac = new AbortController();
    uploadAbortRef.current = ac;
    uploadIdRef.current = null;
    setUploadProgress(0);
    uploadFile.mutate(
      {
        file,
        taskId,
        signal: ac.signal,
        onProgress: (ratio) => setUploadProgress(Math.round(ratio * 100)),
        onSession: (id) => {
          uploadIdRef.current = id;
        },
      },
      {
        onSuccess: () => {
          toast.success(t('files.uploaded'));
          setUploadProgress(null);
          uploadAbortRef.current = null;
          uploadIdRef.current = null;
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError: (err) => {
          const aborted =
            (err instanceof DOMException && err.name === 'AbortError') ||
            (err instanceof Error && err.name === 'AbortError');
          setUploadProgress(null);
          uploadAbortRef.current = null;
          uploadIdRef.current = null;
          if (fileInputRef.current) fileInputRef.current.value = '';
          if (aborted) return;
          toastRequestError(err, t('error'));
        },
      },
    );
  };

  const onCancelUpload = () => {
    const id = uploadIdRef.current;
    uploadAbortRef.current?.abort();
    if (id) {
      void cancelUpload(id).catch(() => {
        /* ignore */
      });
    }
    setUploadProgress(null);
    uploadAbortRef.current = null;
    uploadIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success(t('files.uploadCancelled'));
  };

  if (taskQuery.isLoading) {
    return <p className="text-muted text-sm">{t('loading')}</p>;
  }

  if (taskQuery.isError || !task) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-danger text-sm">{taskQuery.isError ? t('error') : t('notFound')}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onPress={() => void taskQuery.refetch()}>
            {t('retry')}
          </Button>
          <Button size="sm" variant="ghost" onPress={onClose}>
            {variant === 'page' ? (
              <>
                <ArrowLeftIcon className="size-4" aria-hidden />
                {t('back')}
              </>
            ) : (
              t('close')
            )}
          </Button>
        </div>
      </div>
    );
  }

  const done = Boolean(task.completeAt);
  const favorited = Boolean(favoriteCheck.data?.favorited);
  const readonlyHint = !editEnabled
    ? t('permission.projectReadonly')
    : !(canUpdate || canTime || canStatus || canRemove || canArchive || canMove || canAddTask)
      ? t('permission.noWrite')
      : null;

  return (
    <div className={cn('flex flex-col gap-6', variant === 'page' && 'mx-auto w-full max-w-3xl')}>
      {readonlyHint ? (
        <p className="bg-default/50 text-muted rounded-lg px-3 py-2 text-sm">{readonlyHint}</p>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {variant === 'page' ? (
            <Button size="sm" variant="ghost" className="-ms-2 mb-2" onPress={onClose}>
              <ArrowLeftIcon className="size-4" aria-hidden />
              {t('back')}
            </Button>
          ) : null}
          {variant === 'page' ? (
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          ) : null}
          <p className={cn('text-muted text-sm', variant === 'page' && 'mt-1')}>
            #{task.id}
            {task.flowItemName ? ` · ${task.flowItemName}` : ''}
            {task.priorityName ? ` · ${task.priorityName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {variant === 'modal' ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={onPopout}
              aria-label={t('openIndependent')}
            >
              <ArrowTopRightOnSquareIcon className="size-4" aria-hidden />
              {t('openIndependent')}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            isIconOnly
            aria-label={favorited ? t('unfavorite') : t('favorite')}
            onPress={onToggleFavorite}
            isDisabled={toggleFavorite.isPending || favoriteCheck.isLoading}
          >
            {favorited ? (
              <StarIconSolid className="text-warning size-4" aria-hidden />
            ) : (
              <StarIcon className="size-4" aria-hidden />
            )}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={onOpenDialog}
            isDisabled={ensureDialog.isPending}
          >
            <ChatBubbleLeftRightIcon className="size-4" aria-hidden />
            {ensureDialog.isPending ? t('dialog.opening') : t('dialog.open')}
          </Button>
          <TaskSendToChatModal taskId={task.id} taskName={task.name} />
          <Button
            size="sm"
            variant="secondary"
            onPress={() => void taskQuery.refetch()}
            isDisabled={taskQuery.isFetching}
          >
            <ArrowPathIcon className="size-4" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={onCopy}
            isDisabled={copyTask.isPending || !isMainTask || !canAddTask}
          >
            <DocumentDuplicateIcon className="size-4" aria-hidden />
            {copyTask.isPending ? t('copy.running') : t('copy.action')}
          </Button>
          {!isMainTask ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={onUpgrade}
              isDisabled={upgradeTask.isPending || !canUpdate}
            >
              <ArrowUpCircleIcon className="size-4" aria-hidden />
              {upgradeTask.isPending ? t('upgrade.running') : t('upgrade.action')}
            </Button>
          ) : null}
          {isMainTask ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={onAiGenerate}
              isDisabled={aiGenerate.isPending || !canUpdate}
            >
              <SparklesIcon className="size-4" aria-hidden />
              {aiGenerate.isPending ? t('ai.running') : t('ai.generate')}
            </Button>
          ) : null}
          {canStatus ? (
            <Button
              size="sm"
              variant={done ? 'secondary' : 'primary'}
              onPress={onToggleComplete}
              isDisabled={updateTask.isPending}
            >
              <CheckCircleIcon className="size-4" aria-hidden />
              {done ? t('reopen') : t('complete')}
            </Button>
          ) : null}
          {canArchive ? (
            <Button
              size="sm"
              variant="danger"
              onPress={onArchive}
              isDisabled={archiveTask.isPending}
            >
              <ArchiveBoxIcon className="size-4" aria-hidden />
              {t('archive')}
            </Button>
          ) : null}
          {canRemove ? (
            <Button size="sm" variant="danger" onPress={onRemove} isDisabled={removeTask.isPending}>
              <TrashIcon className="size-4" aria-hidden />
              {removeTask.isPending ? t('remove.running') : t('remove.action')}
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Meta
          label={t('fields.status')}
          value={done ? t('completed') : t('open')}
          accent={done ? undefined : 'open'}
        />
        <Meta label={t('fields.visibility')} value={t(`visibility.${task.visibility || 1}`)} />
      </div>

      <Form
        className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4"
        onSubmit={onSave}
        style={color ? { borderLeftWidth: 4, borderLeftColor: color } : undefined}
      >
        <TextField
          name="name"
          value={name}
          onChange={setName}
          isRequired
          className="w-full"
          isDisabled={!canUpdate}
        >
          <Label>{t('fields.name')}</Label>
          <Input />
        </TextField>
        <TextField
          name="description"
          value={description}
          onChange={setDescription}
          className="w-full"
          isDisabled={!canUpdate}
        >
          <Label>{t('fields.description')}</Label>
          <TextArea rows={5} placeholder={t('fields.noDescription')} />
        </TextField>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            className="w-full"
            value={priorityKey}
            onChange={(key) => setPriorityKey(String(key ?? '0'))}
            isDisabled={!canUpdate}
          >
            <Label>{t('fields.priority')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="0" textValue={t('fields.none')}>
                  {t('fields.none')}
                </ListBox.Item>
                {(priorities.data ?? []).map((p: TaskPriorityItem) => (
                  <ListBox.Item key={p.priority} id={String(p.priority)} textValue={p.name}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: p.color || '#909399' }}
                        aria-hidden
                      />
                      {p.name}
                    </span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          {isMainTask ? (
            <Select
              className="w-full"
              value={visibility}
              onChange={(key) => setVisibility(String(key ?? '1'))}
              isDisabled={!canUpdate}
            >
              <Label>{t('fields.visibility')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="1" textValue={t('visibility.1')}>
                    {t('visibility.1')}
                  </ListBox.Item>
                  <ListBox.Item id="2" textValue={t('visibility.2')}>
                    {t('visibility.2')}
                  </ListBox.Item>
                  <ListBox.Item id="3" textValue={t('visibility.3')}>
                    {t('visibility.3')}
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          ) : null}
        </div>
        {isMainTask && visibility === '3' ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t('visibility.userIds')}</p>
            {memberCandidates.length === 0 ? (
              <p className="text-muted text-xs">{t('assignees.emptyMembers')}</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {memberCandidates.map((m) => {
                  const on = visibilityUserIds.includes(m.userId);
                  return (
                    <Checkbox
                      key={`vis-${m.userId}`}
                      isSelected={on}
                      isDisabled={!canUpdate}
                      onChange={(checked) => {
                        setVisibilityUserIds((prev) => {
                          if (checked) {
                            return prev.includes(m.userId) ? prev : [...prev, m.userId];
                          }
                          return prev.filter((id) => id !== m.userId);
                        });
                      }}
                    >
                      {memberLabel(m)}
                    </Checkbox>
                  );
                })}
              </div>
            )}
            <p className="text-muted text-xs">{t('visibility.userIdsHint')}</p>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t('fields.owners')}</p>
          {memberCandidates.length === 0 ? (
            <p className="text-muted text-xs">{t('assignees.emptyMembers')}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {memberCandidates.map((m) => {
                const on = ownerUserIds.includes(m.userId);
                return (
                  <Checkbox
                    key={`owner-${m.userId}`}
                    isSelected={on}
                    isDisabled={!canUpdate}
                    onChange={(checked) => {
                      if (checked) {
                        if (ownerUserIds.includes(m.userId)) return;
                        if (ownerUserIds.length >= MAX_TASK_ASSIGNEES) {
                          toast.danger(t('assignees.limit', { max: MAX_TASK_ASSIGNEES }));
                          return;
                        }
                        setOwnerUserIds((prev) =>
                          prev.includes(m.userId) ? prev : [...prev, m.userId],
                        );
                        setAssistUserIds((prev) => prev.filter((id) => id !== m.userId));
                        return;
                      }
                      if (ownerUserIds.length <= 1 && ownerUserIds.includes(m.userId)) {
                        toast.danger(t('assignees.ownerRequired'));
                        return;
                      }
                      setOwnerUserIds((prev) => prev.filter((id) => id !== m.userId));
                    }}
                  >
                    {memberLabel(m)}
                  </Checkbox>
                );
              })}
            </div>
          )}
          <p className="text-muted text-xs">
            {t('assignees.ownerHint', { max: MAX_TASK_ASSIGNEES })}
          </p>
        </div>
        {isMainTask ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t('fields.assists')}</p>
            {memberCandidates.length === 0 ? (
              <p className="text-muted text-xs">{t('assignees.emptyMembers')}</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {memberCandidates.map((m) => {
                  const on = assistUserIds.includes(m.userId);
                  const isOwner = ownerUserIds.includes(m.userId);
                  return (
                    <Checkbox
                      key={`assist-${m.userId}`}
                      isSelected={on}
                      isDisabled={isOwner || !canUpdate}
                      onChange={(checked) => {
                        if (checked) {
                          if (assistUserIds.includes(m.userId) || ownerUserIds.includes(m.userId)) {
                            return;
                          }
                          if (assistUserIds.length >= MAX_TASK_ASSIGNEES) {
                            toast.danger(t('assignees.limit', { max: MAX_TASK_ASSIGNEES }));
                            return;
                          }
                          setAssistUserIds((prev) =>
                            prev.includes(m.userId) ? prev : [...prev, m.userId],
                          );
                          return;
                        }
                        setAssistUserIds((prev) => prev.filter((id) => id !== m.userId));
                      }}
                    >
                      {memberLabel(m)}
                    </Checkbox>
                  );
                })}
              </div>
            )}
            <p className="text-muted text-xs">
              {t('assignees.assistHint', { max: MAX_TASK_ASSIGNEES })}
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t('fields.color')}</p>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c || 'none'}
                type="button"
                disabled={!canUpdate}
                className="size-6 rounded-full border-2 disabled:opacity-50"
                style={{
                  backgroundColor: c || 'transparent',
                  borderColor: color === c ? 'var(--color-accent)' : 'var(--color-border)',
                }}
                aria-label={c || t('fields.none')}
                onClick={() => setColor(c)}
              />
            ))}
            <TextField className="w-28" value={color} onChange={setColor} isDisabled={!canUpdate}>
              <Label className="sr-only">{t('fields.color')}</Label>
              <Input placeholder="#hex" />
            </TextField>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t('fields.tags')}</p>
          {(projectTags.data?.length ?? 0) === 0 ? (
            <p className="text-muted text-xs">{t('tags.emptyProject')}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {(projectTags.data ?? []).map((tag: ProjectTagView) => {
                const on = tagIds.includes(tag.id);
                return (
                  <Checkbox
                    key={tag.id}
                    isSelected={on}
                    isDisabled={!canUpdate}
                    onChange={(checked) => {
                      setTagIds((prev) => {
                        if (checked) {
                          if (prev.includes(tag.id)) return prev;
                          if (prev.length >= MAX_TASK_TAGS) {
                            toast.danger(t('tags.limit', { max: MAX_TASK_TAGS }));
                            return prev;
                          }
                          return [...prev, tag.id];
                        }
                        return prev.filter((id) => id !== tag.id);
                      });
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: tag.color || '#909399' }}
                        aria-hidden
                      />
                      {tag.name}
                    </span>
                  </Checkbox>
                );
              })}
            </div>
          )}
          <p className="text-muted text-xs">{t('tags.hint', { max: MAX_TASK_TAGS })}</p>
        </div>
        {isMainTask ? (
          <TextField
            name="content"
            value={content}
            onChange={setContent}
            className="w-full"
            isDisabled={!canUpdate}
          >
            <Label>{t('content.label')}</Label>
            <TextArea rows={8} placeholder={t('content.placeholder')} />
          </TextField>
        ) : null}
        {isMainTask && viewHistoryId != null ? (
          <div className="bg-default/40 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2">
            <p className="text-muted text-xs">{t('content.viewingHistory')}</p>
            <Button size="sm" variant="secondary" onPress={() => setViewHistoryId(null)}>
              {t('content.backLatest')}
            </Button>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <TaskDatePicker
            name="startAt"
            label={t('fields.startAt')}
            value={startAt}
            onChange={setStartAt}
            isDisabled={!canTime}
          />
          <TaskDatePicker
            name="endAt"
            label={t('fields.endAt')}
            value={endAt}
            onChange={setEndAt}
            isDisabled={!canTime}
          />
        </div>
        {nextStart && nextEnd && ownerUserIds.length > 0 ? (
          <TaskScheduleConflicts
            userIds={ownerUserIds}
            startAt={nextStart}
            endAt={nextEnd}
            excludeTaskId={taskId}
            onOpenTask={openOtherTask}
          />
        ) : null}
        {isMainTask ? (
          <Select
            className="w-full sm:max-w-xs"
            value={loop}
            onChange={(key) => setLoop(String(key ?? '0'))}
            aria-label={t('loop.label')}
            isDisabled={!canUpdate}
          >
            <Label>{t('loop.label')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {(['0', '1', '2', '3', '4'] as const).map((id) => (
                  <ListBox.Item key={id} id={id} textValue={t(`loop.${id}`)}>
                    {t(`loop.${id}`)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : (
          <p className="text-muted text-xs">{t('loop.subtaskHint')}</p>
        )}
        {isMainTask && nextLoop > 0 ? <p className="text-muted text-xs">{t('loop.hint')}</p> : null}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            isDisabled={!dirty || updateTask.isPending || (!canUpdate && !canTime)}
          >
            {t('save')}
          </Button>
        </div>
      </Form>

      {isMainTask ? (
        <section className="border-border bg-surface rounded-xl border p-4">
          <h2 className="text-sm font-semibold">{t('content.historyTitle')}</h2>
          <p className="text-muted mt-1 text-xs">{t('content.historyHint')}</p>
          {historyQuery.isLoading ? (
            <p className="text-muted mt-2 text-sm">{t('loading')}</p>
          ) : (historyQuery.data?.items?.length ?? 0) === 0 ? (
            <p className="text-muted mt-2 text-sm">{t('content.historyEmpty')}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {(historyQuery.data?.items ?? []).map((item: TaskContentHistoryItem) => {
                const active = viewHistoryId === item.id;
                return (
                  <li key={item.id}>
                    <Button
                      size="sm"
                      variant={active ? 'secondary' : 'ghost'}
                      className="h-auto w-full justify-start px-2 py-1.5 text-left font-normal"
                      onPress={() => setViewHistoryId(item.id)}
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm">
                          {item.description.trim() || t('content.untitledVersion')}
                        </span>
                        <span className="text-muted text-xs">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                        </span>
                      </span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {(historyQuery.data?.meta?.totalPage ?? 0) > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="secondary"
                isDisabled={historyPage <= 1 || historyQuery.isFetching}
                onPress={() => setHistoryPage((p) => Math.max(1, p - 1))}
              >
                {t('content.prevPage')}
              </Button>
              <span className="text-muted text-xs">
                {t('content.page', {
                  page: historyQuery.data?.meta.page ?? historyPage,
                  total: historyQuery.data?.meta.totalPage ?? 1,
                })}
              </span>
              <Button
                size="sm"
                variant="secondary"
                isDisabled={
                  historyPage >= (historyQuery.data?.meta.totalPage ?? 1) || historyQuery.isFetching
                }
                onPress={() => setHistoryPage((p) => p + 1)}
              >
                {t('content.nextPage')}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isMainTask && canMove ? (
        <section className="border-border bg-surface rounded-xl border p-4">
          <h2 className="text-sm font-semibold">{t('move.title')}</h2>
          <p className="text-muted mt-1 text-xs">{t('move.hint')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Select
              className="w-full"
              value={moveProjectId}
              onChange={(key) => {
                setMoveProjectId(String(key ?? ''));
                setMoveColumnId('');
              }}
            >
              <Label>{t('move.project')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(projectList.data ?? []).map((p: ProjectView) => (
                    <ListBox.Item key={p.id} id={String(p.id)} textValue={p.name}>
                      {p.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              className="w-full"
              value={moveColumnId}
              onChange={(key) => setMoveColumnId(String(key ?? ''))}
              isDisabled={!moveProjectId || moveColumns.isLoading}
            >
              <Label>{t('move.column')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(moveColumns.data ?? []).map((c: ProjectColumnView) => (
                    <ListBox.Item key={c.id} id={String(c.id)} textValue={c.name}>
                      {c.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <Button
            className="mt-3"
            size="sm"
            variant="secondary"
            isDisabled={
              moveTask.isPending || !moveProjectId || !moveColumnId || moveColumns.isLoading
            }
            onPress={onMove}
          >
            <ArrowsRightLeftIcon className="size-4" aria-hidden />
            {moveTask.isPending ? t('move.running') : t('move.action')}
          </Button>
        </section>
      ) : null}

      <section className="border-border bg-surface rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('template.title')}</h2>
          {canManageTemplates ? (
            <Button
              size="sm"
              variant="secondary"
              isDisabled={saveTemplate.isPending}
              onPress={onSaveAsTemplate}
            >
              {saveTemplate.isPending ? t('template.saving') : t('template.save')}
            </Button>
          ) : null}
        </div>
        <p className="text-muted mt-1 text-xs">{t('template.hint')}</p>
        {templates.isLoading ? (
          <p className="text-muted mt-2 text-sm">{t('loading')}</p>
        ) : (templates.data ?? []).length === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('template.empty')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {(templates.data ?? []).map((tpl: TaskTemplateView, index: number) => {
              const isDefault = tpl.isDefault === 1 || tpl.isDefault === true;
              const total = templates.data?.length ?? 0;
              return (
                <li key={tpl.id} className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start px-2 py-1.5 text-left font-normal"
                    onPress={() => onApplyTemplate(tpl)}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {isDefault ? (
                        <StarIconSolid className="text-warning size-3.5 shrink-0" aria-hidden />
                      ) : null}
                      <span className="truncate text-sm">
                        {tpl.name || tpl.title || `#${tpl.id}`}
                      </span>
                    </span>
                  </Button>
                  {canManageTemplates ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={t('template.moveUp')}
                        isDisabled={sortTemplates.isPending || index === 0}
                        onPress={() => onMoveTemplate(tpl.id, -1)}
                      >
                        <ChevronUpIcon className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={t('template.moveDown')}
                        isDisabled={sortTemplates.isPending || index >= total - 1}
                        onPress={() => onMoveTemplate(tpl.id, 1)}
                      >
                        <ChevronDownIcon className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={
                          isDefault ? t('template.unsetDefault') : t('template.setDefault')
                        }
                        isDisabled={toggleTemplateDefault.isPending}
                        onPress={() => onToggleTemplateDefault(tpl)}
                      >
                        {isDefault ? (
                          <StarIconSolid className="text-warning size-4" aria-hidden />
                        ) : (
                          <StarIcon className="size-4" aria-hidden />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={t('template.delete')}
                        isDisabled={deleteTemplate.isPending}
                        onPress={() => onDeleteTemplate(tpl)}
                      >
                        <TrashIcon className="size-4" aria-hidden />
                      </Button>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <TextField
          className="mt-3 w-full"
          value={templateQuery}
          onChange={setTemplateQuery}
          aria-label={t('template.searchPlaceholder')}
        >
          <Label>{t('template.sharedTitle')}</Label>
          <Input placeholder={t('template.searchPlaceholder')} />
        </TextField>
        <p className="text-muted mt-1 text-xs">{t('template.sharedHint')}</p>
        {templateSearchDebounced && templateSearch.isFetching ? (
          <p className="text-muted mt-2 text-sm">{t('loading')}</p>
        ) : sharedTemplates.length === 0 ? (
          <p className="text-muted mt-2 text-sm">
            {templateSearchDebounced ? t('template.searchEmpty') : t('template.sharedEmpty')}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {sharedTemplates.map((tpl: TaskTemplateView) => (
              <li key={`shared-${tpl.id}`}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-auto w-full justify-start px-2 py-1.5 text-left font-normal"
                  onPress={() => onApplyTemplate(tpl)}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm">
                      {tpl.name || tpl.title || `#${tpl.id}`}
                    </span>
                    <span className="text-muted truncate text-xs">
                      {tpl.projectName || `#${tpl.projectId}`}
                      {tpl.useCount != null
                        ? ` · ${t('template.useCount', { count: tpl.useCount })}`
                        : ''}
                    </span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('flow.title')}</h2>
        {flowQuery.isLoading ? (
          <p className="text-muted mt-2 text-sm">{t('loading')}</p>
        ) : (flowQuery.data?.turns?.length ?? 0) === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('flow.empty')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {flowQuery.data!.turns.map((turn: TaskFlowTurn) => {
              const active = turn.id === flowQuery.data?.flowItemId;
              return (
                <li
                  key={turn.id}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
                    active ? 'border-accent bg-accent/5' : 'border-border',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{turn.name}</p>
                    <p className="text-muted text-xs">{turn.status}</p>
                  </div>
                  {active ? (
                    <span className="text-accent text-xs">{t('fields.flow')}</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={changeFlow.isPending || !canStatus}
                      onPress={() =>
                        changeFlow.mutate(
                          { taskId, flowItemId: turn.id },
                          {
                            onSuccess: () => toast.success(t('saved')),
                            onError: (err) => toastRequestError(err, t('error')),
                          },
                        )
                      }
                    >
                      {t('flow.change')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('subtasks.title')}</h2>
        {(subtasksQuery.data ?? []).length === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('subtasks.empty')}</p>
        ) : (
          <ul className="divide-border mt-3 divide-y">
            {(subtasksQuery.data ?? []).map((sub: TaskView) => (
              <li key={sub.id}>
                <Button
                  variant="ghost"
                  className="hover:bg-default h-auto w-full justify-between gap-3 rounded-none px-1 py-2.5 text-left font-normal"
                  onPress={() => openOtherTask(sub.id)}
                >
                  <span
                    className={cn('truncate text-sm', sub.completeAt && 'text-muted line-through')}
                  >
                    {sub.name}
                  </span>
                  {sub.completeAt ? (
                    <span className="text-muted shrink-0 text-xs">{t('subtasks.done')}</span>
                  ) : null}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {canAddTask ? (
          <Form className="mt-3 flex gap-2" onSubmit={onAddSubtask}>
            <TextField
              name="subtask"
              value={subtaskName}
              onChange={setSubtaskName}
              className="min-w-0 flex-1"
              aria-label={t('subtasks.placeholder')}
            >
              <Input placeholder={t('subtasks.placeholder')} />
            </TextField>
            <Button
              type="submit"
              size="sm"
              isDisabled={!subtaskName.trim() || addSubtask.isPending}
            >
              {t('subtasks.add')}
            </Button>
          </Form>
        ) : null}
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('related.title')}</h2>
        <p className="text-muted mt-1 text-xs">{t('related.hint')}</p>
        {relatedQuery.isLoading ? (
          <p className="text-muted mt-2 text-sm">{t('loading')}</p>
        ) : (relatedQuery.data?.items?.length ?? 0) === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('related.empty')}</p>
        ) : (
          <ul className="divide-border mt-3 divide-y">
            {(relatedQuery.data?.items ?? []).map((item: TaskRelatedItem) => {
              const related = item.task;
              return (
                <li
                  key={item.relatedTaskId}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <Button
                    variant="ghost"
                    className="hover:bg-default h-auto min-w-0 flex-1 justify-start px-1 py-1.5 text-left font-normal"
                    onPress={() => openOtherTask(item.relatedTaskId)}
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className={cn(
                          'truncate text-sm',
                          related.completeAt && 'text-muted line-through',
                        )}
                      >
                        {related.name || `#${item.relatedTaskId}`}
                      </span>
                      <span className="text-muted truncate text-xs">
                        {related.projectName || `#${related.projectId}`}
                        {related.columnName ? ` · ${related.columnName}` : ''}
                      </span>
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={deleteRelated.isPending || !canUpdate}
                    onPress={() => onRemoveRelated(item.relatedTaskId)}
                  >
                    {t('related.remove')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {canUpdate ? (
          <Form className="mt-3 flex gap-2" onSubmit={onAddRelated}>
            <TextField
              name="relatedTaskId"
              value={relatedTaskIdText}
              onChange={setRelatedTaskIdText}
              className="min-w-0 flex-1"
              aria-label={t('related.placeholder')}
            >
              <Input placeholder={t('related.placeholder')} />
            </TextField>
            <Button
              type="submit"
              size="sm"
              isDisabled={!relatedTaskIdText.trim() || addRelated.isPending}
            >
              {t('related.add')}
            </Button>
          </Form>
        ) : null}
        {relatedSearchDebounced ? (
          <div className="border-border mt-2 max-h-40 overflow-auto rounded-lg border">
            {relatedSearch.isFetching ? (
              <p className="text-muted px-3 py-2 text-xs">{t('loading')}</p>
            ) : relatedHits.length === 0 ? (
              <p className="text-muted px-3 py-2 text-xs">{t('related.searchEmpty')}</p>
            ) : (
              <ul>
                {relatedHits.map((hit: SearchHitView) => (
                  <li key={hit.id}>
                    <Button
                      variant="ghost"
                      className="h-auto w-full justify-start rounded-none px-3 py-2 text-left font-normal"
                      isDisabled={addRelated.isPending}
                      onPress={() => linkRelated(hit.id)}
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm">{hit.title}</span>
                        {hit.snippet ? (
                          <span className="text-muted truncate text-xs">{hit.snippet}</span>
                        ) : null}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('files.title')}</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => onUploadAttachment(e.target.files)}
            />
            <Button
              size="sm"
              variant="secondary"
              isDisabled={uploadFile.isPending || !canUpdate}
              onPress={() => fileInputRef.current?.click()}
            >
              <ArrowUpTrayIcon className="size-4" aria-hidden />
              {uploadFile.isPending ? t('files.uploading') : t('files.upload')}
            </Button>
          </div>
        </div>
        {uploadProgress != null ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-muted text-xs">{t('files.progress', { percent: uploadProgress })}</p>
            <Button size="sm" variant="ghost" onPress={onCancelUpload}>
              {t('files.uploadCancel')}
            </Button>
          </div>
        ) : null}
        {(filesQuery.data ?? []).length === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('files.empty')}</p>
        ) : (
          <>
            <p className="text-muted mt-1 text-xs">
              {t('files.count', { count: filesQuery.data!.length })}
            </p>
            <ul className="divide-border mt-3 divide-y">
              {(filesQuery.data ?? []).map((file: TaskFileView) => (
                <li key={file.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                  <span className="text-muted shrink-0 text-xs">
                    {formatFileSize(file.size)}
                    {file.extension ? ` · ${file.extension.toUpperCase()}` : ''}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={t('files.download')}
                      isDisabled={downloadFile.isPending}
                      onPress={() => onDownloadFile(file)}
                    >
                      <ArrowDownTrayIcon className="size-4" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={t('files.delete')}
                      isDisabled={deleteFile.isPending || !canUpdate}
                      onPress={() => onDeleteFile(file)}
                    >
                      <TrashIcon className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-sm font-semibold">{t('logs.title')}</h2>
        {logsQuery.isLoading ? (
          <p className="text-muted mt-2 text-sm">{t('loading')}</p>
        ) : (logsQuery.data?.items?.length ?? 0) === 0 ? (
          <p className="text-muted mt-2 text-sm">{t('logs.empty')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {(logsQuery.data?.items ?? []).map((log: ProjectLogView) => {
              const canReset = isProjectLogFlowResettable(log.record) && canStatus;
              return (
                <li
                  key={log.id}
                  className="border-border flex flex-col gap-0.5 rounded-lg border px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm">{log.detail || '—'}</p>
                    {canReset ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        isDisabled={resetFromLog.isPending}
                        onPress={() => {
                          if (!window.confirm(t('logs.resetConfirm'))) return;
                          resetFromLog.mutate(
                            {
                              logId: log.id,
                              taskId,
                              projectId: task?.projectId,
                            },
                            {
                              onSuccess: () => toast.success(t('logs.resetOk')),
                              onError: (err) => toastRequestError(err, t('error')),
                            },
                          );
                        }}
                      >
                        {t('logs.reset')}
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-muted text-xs">
                    {[log.time?.ymd, log.time?.hi].filter(Boolean).join(' ') ||
                      (log.createdAt ? new Date(log.createdAt).toLocaleString() : '')}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meta({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: 'open';
}) {
  return (
    <div className="border-border bg-surface rounded-xl border px-4 py-3">
      <p className="text-muted text-xs">{label}</p>
      <p
        className={cn('mt-1 text-sm font-medium', accent === 'open' && 'text-accent')}
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
