import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toastRequestError } from '../../utils/toast-request-error';
import {
  Button,
  Input,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Table,
  TextField,
  toast,
} from '@heroui/react';
import { StarIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import {
  StarIcon as StarIconSolid,
  BookmarkIcon as BookmarkIconSolid,
} from '@heroicons/react/24/solid';
import {
  isId,
  projectMemberHasPoint,
  useArchiveProject,
  useCreateTask,
  useFavoriteCheck,
  useProject,
  useProjectColumns,
  useProjectFlowList,
  useProjectList,
  useProjectPermission,
  useRealtimeStatus,
  useSortUserProjects,
  useTaskList,
  useToggleFavorite,
  useToggleProjectTop,
  type ProjectColumnView,
  type ProjectFlowItemView,
  type ProjectView,
  type TaskView,
} from '@blue-dock/api';
import { useTranslation } from '@blue-dock/i18n';
import { cn } from '../../utils/cn';
import { useScreen } from '../../utils/platform';
import { CreateProjectModal } from './CreateProjectModal';
import { ProjectPermissionModal } from './ProjectPermissionModal';
import { ProjectFlowModal } from './ProjectFlowModal';
import { ProjectTagsModal } from './ProjectTagsModal';
import { ProjectColumnsModal } from './ProjectColumnsModal';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { ProjectMembersModal } from './ProjectMembersModal';
import { ProjectBoard } from './ProjectBoard';
import { ProjectGantt } from './ProjectGantt';
import { ProjectWorkflow } from './ProjectWorkflow';
import { TaskModal } from '../task/TaskModal';
import { ProjectBatchBar } from './ProjectBatchBar';
import { ProjectLogsModal } from './ProjectLogsModal';
import { downloadTasksCsv } from './export-tasks-csv';
import { TaskTagDots } from './TaskTagDots';
import { TaskOwnerChips } from './TaskOwnerChips';
import {
  useProjectUiStore,
  type ProjectPriorityFilter,
  type ProjectViewMode,
} from '../../stores/project';

type SidebarMode = 'active' | 'archived';

type ViewMode = ProjectViewMode;

function ownerLabel(level: number, t: (k: string) => string): string {
  if (level === 1) return t('detail.ownerLevel.1');
  if (level === 2) return t('detail.ownerLevel.2');
  return t('detail.ownerLevel.0');
}

function matchesSearch(task: TaskView, q: string): boolean {
  if (!q) return true;
  if (String(task.id).includes(q)) return true;
  if (task.name.toLowerCase().includes(q)) return true;
  if ((task.description || '').toLowerCase().includes(q)) return true;
  return false;
}

function matchesPriority(task: TaskView, priority: ProjectPriorityFilter): boolean {
  if (priority === 'all') return true;
  if (priority === 'unset') return !task.priorityLevel;
  return String(task.priorityLevel) === priority;
}

/** 项目详情：侧栏切换 + 看板 / 列表 / 甘特 + 搜索筛选 */
export function ProjectPage() {
  const { t } = useTranslation('project');
  const navigate = useNavigate();
  const { navMode } = useScreen();
  const params = useParams();
  const projectId = useMemo<number | undefined>(
    () => (isId(params.projectId) ? (params.projectId as unknown as number) : undefined),
    [params.projectId],
  );

  const { connected } = useRealtimeStatus();
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('active');
  const projects = useProjectList(
    { archived: sidebarMode === 'archived' ? 'yes' : 'no', type: 'all' },
    connected,
  );
  const project = useProject(projectId);
  const archiveProject = useArchiveProject();
  const columns = useProjectColumns(projectId, connected);
  const flows = useProjectFlowList(projectId);
  const tasks = useTaskList(
    projectId ? { projectId, includeArchived: false } : undefined,
    connected,
  );
  const createTask = useCreateTask();
  const favoriteCheck = useFavoriteCheck('project', projectId ?? 0, Boolean(projectId));
  const toggleFavorite = useToggleFavorite();
  const toggleTop = useToggleProjectTop();
  const sortProjects = useSortUserProjects();
  const sidebarDragId = useRef<number | null>(null);
  const pref = useProjectUiStore((s) =>
    projectId
      ? s.getPref(projectId)
      : { view: 'board' as ViewMode, showCompleted: false, columnId: 0, priority: 'all' as const },
  );
  const setView = useProjectUiStore((s) => s.setView);
  const setShowCompleted = useProjectUiStore((s) => s.setShowCompleted);
  const setColumnFilter = useProjectUiStore((s) => s.setColumnFilter);
  const setPriorityFilter = useProjectUiStore((s) => s.setPriorityFilter);
  const [draftByColumn, setDraftByColumn] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const view = pref.view;
  const showCompleted = pref.showCompleted;
  const columnFilter = pref.columnId;
  const priorityFilter = pref.priority;
  const searchQ = search.trim().toLowerCase();

  const favorited = Boolean(favoriteCheck.data?.favorited);

  const onToggleFavorite = () => {
    if (!projectId) return;
    const was = favorited;
    toggleFavorite.mutate(
      { type: 'project', id: projectId },
      {
        onSuccess: () => toast.success(was ? t('detail.unfavorited') : t('detail.favorited')),
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const pinned = Boolean(project.data?.topAt);
  const onToggleTop = () => {
    if (!projectId) return;
    const was = pinned;
    toggleTop.mutate(projectId, {
      onSuccess: () => toast.success(was ? t('settings.unpinned') : t('settings.pinned')),
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const priorityOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const task of tasks.data ?? []) {
      if (!task.priorityLevel) continue;
      if (!map.has(task.priorityLevel)) {
        map.set(task.priorityLevel, task.priorityName || String(task.priorityLevel));
      }
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [tasks.data]);

  const taskList = useMemo((): TaskView[] => {
    const items: TaskView[] = tasks.data ?? [];
    return items.filter((x) => {
      if (!showCompleted && x.completeAt) return false;
      if (columnFilter > 0 && x.columnId !== columnFilter) return false;
      if (!matchesPriority(x, priorityFilter)) return false;
      if (!matchesSearch(x, searchQ)) return false;
      return true;
    });
  }, [showCompleted, tasks.data, columnFilter, priorityFilter, searchQ]);

  const totalVisible = useMemo(() => {
    const items: TaskView[] = tasks.data ?? [];
    return showCompleted ? items.length : items.filter((x) => !x.completeAt).length;
  }, [showCompleted, tasks.data]);

  const byColumn = useMemo(() => {
    const map = new Map<number, TaskView[]>();
    const cols = columns.data ?? [];
    const visibleCols = columnFilter > 0 ? cols.filter((c) => c.id === columnFilter) : cols;
    for (const col of visibleCols) map.set(col.id, []);
    for (const task of taskList) {
      const bucket = map.get(task.columnId);
      if (bucket) bucket.push(task);
      else if (columnFilter === 0) {
        const orphan = map.get(0) ?? [];
        orphan.push(task);
        map.set(0, orphan);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort - b.sort || a.id - b.id);
    }
    return map;
  }, [columns.data, taskList, columnFilter]);

  const activeFlow = useMemo(() => {
    const list = flows.data ?? [];
    return list.find((f) => (f.items?.length ?? 0) > 0) ?? list[0] ?? null;
  }, [flows.data]);

  const flowItems = useMemo((): ProjectFlowItemView[] => {
    const items = activeFlow?.items ?? [];
    return [...items].sort((a, b) => a.sort - b.sort || a.id - b.id);
  }, [activeFlow]);

  const byFlowItem = useMemo(() => {
    const map = new Map<number, TaskView[]>();
    for (const it of flowItems) map.set(it.id, []);
    map.set(0, []);
    for (const task of taskList) {
      const key = task.flowItemId > 0 ? task.flowItemId : 0;
      const bucket = map.get(key);
      if (bucket) bucket.push(task);
      else {
        const orphan = map.get(0) ?? [];
        orphan.push(task);
        map.set(0, orphan);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sort - b.sort || a.id - b.id);
    }
    return map;
  }, [flowItems, taskList]);

  const openTask = (id: number) => setOpenTaskId(id);

  const toggleSelect = (taskId: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectVisible = () => setSelectedIds(new Set(taskList.map((x) => x.id)));

  const filtersActive = Boolean(searchQ) || columnFilter > 0 || priorityFilter !== 'all';

  const isOwner = project.data?.myOwner === 1;
  const isArchived = Boolean(project.data?.archivedAt);
  const myOwner = project.data?.myOwner ?? 0;
  const editEnabled = Boolean(
    project.data && !project.data.departmentReadonly && !project.data.archivedAt,
  );
  const permissionQuery = useProjectPermission(
    projectId,
    Boolean(project.data) && !project.data?.isPersonal && myOwner === 0,
  );
  const perm = permissionQuery.data;
  const canAddColumn = editEnabled && projectMemberHasPoint(myOwner, perm, 'TASK_LIST_ADD');
  const canUpdateColumn = editEnabled && projectMemberHasPoint(myOwner, perm, 'TASK_LIST_UPDATE');
  const canRemoveColumn = editEnabled && projectMemberHasPoint(myOwner, perm, 'TASK_LIST_REMOVE');
  const canSortColumns = editEnabled && projectMemberHasPoint(myOwner, perm, 'TASK_LIST_SORT');
  const canAddTask = editEnabled && projectMemberHasPoint(myOwner, perm, 'TASK_ADD');
  const canDragTasks =
    editEnabled &&
    !filtersActive &&
    navMode !== 'tabbar' &&
    projectMemberHasPoint(myOwner, perm, 'TASK_MOVE');
  const canDragWorkflow =
    editEnabled &&
    !filtersActive &&
    navMode !== 'tabbar' &&
    projectMemberHasPoint(myOwner, perm, 'TASK_STATUS');
  const canSortBoardColumns =
    editEnabled && navMode !== 'tabbar' && projectMemberHasPoint(myOwner, perm, 'TASK_LIST_SORT');
  const canBatchComplete = editEnabled && projectMemberHasPoint(myOwner, perm, 'TASK_STATUS');
  const canBatchArchive = editEnabled && projectMemberHasPoint(myOwner, perm, 'TASK_ARCHIVED');
  const canBatchMove = editEnabled && projectMemberHasPoint(myOwner, perm, 'TASK_MOVE');
  const batchEnabled = canBatchComplete || canBatchArchive || canBatchMove;

  useEffect(() => {
    if (!batchEnabled && selectedIds.size > 0) setSelectedIds(new Set());
  }, [batchEnabled, selectedIds.size]);

  const onAddTask = (columnId: number, e: FormEvent) => {
    e.preventDefault();
    if (!projectId || !canAddTask) return;
    const name = (draftByColumn[columnId] ?? '').trim();
    if (!name) return;
    createTask.mutate(
      { projectId, name, columnId },
      {
        onSuccess: () => {
          setDraftByColumn((prev) => ({ ...prev, [columnId]: '' }));
          toast.success(t('board.add'));
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const sidebarProjects = projects.data ?? [];
  const sidebarDragEnabled = sidebarMode === 'active' && sidebarProjects.length > 1;

  const onSidebarDragStart = (id: number, e: DragEvent) => {
    if (!sidebarDragEnabled) return;
    sidebarDragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const onSidebarDropBefore = (beforeId: number, e: DragEvent) => {
    e.preventDefault();
    if (!sidebarDragEnabled) return;
    const raw = sidebarDragId.current ?? Number(e.dataTransfer.getData('text/plain'));
    sidebarDragId.current = null;
    const fromId = Number(raw);
    if (!Number.isFinite(fromId) || fromId <= 0 || fromId === beforeId) return;
    const ids = sidebarProjects.map((p) => p.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(beforeId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    sortProjects.mutate(next, {
      onSuccess: () => toast.success(t('sidebar.sorted')),
      onError: (err) => toastRequestError(err, t('error')),
    });
  };

  const onArchiveProject = (type: 'add' | 'recovery') => {
    if (!projectId || !isOwner) return;
    if (type === 'add' && !window.confirm(t('archive.confirm'))) return;
    archiveProject.mutate(
      { projectId, type },
      {
        onSuccess: () => {
          toast.success(type === 'add' ? t('archive.archived') : t('archive.recovered'));
          if (type === 'add') {
            setSidebarMode('archived');
          } else {
            setSidebarMode('active');
          }
        },
        onError: (err) => toastRequestError(err, t('error')),
      },
    );
  };

  const onExportCsv = () => {
    const name = project.data?.name?.trim() || `project-${projectId}`;
    downloadTasksCsv(`${name}-tasks`, taskList);
    toast.success(t('export.ok', { count: taskList.length }));
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [projectId]);

  useEffect(() => {
    if (project.data?.archivedAt) setSidebarMode('archived');
  }, [project.data?.archivedAt, projectId]);

  if (!projectId) {
    return (
      <div className="p-6">
        <p className="text-danger text-sm">{t('error')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <TaskModal taskId={openTaskId} onOpenChange={setOpenTaskId} />
      <aside className="border-border bg-surface hidden w-56 shrink-0 flex-col border-e md:flex">
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <h2 className="text-sm font-semibold">{t('navTitle')}</h2>
          {sidebarMode === 'active' ? (
            <CreateProjectModal
              compact
              listenGlobal={false}
              onCreated={(p) => navigate(`/manage/project/${p.id}`)}
            />
          ) : null}
        </div>
        <div className="border-border flex gap-1 border-b px-2 pb-2">
          <Button
            size="sm"
            variant={sidebarMode === 'active' ? 'primary' : 'ghost'}
            className="flex-1"
            onPress={() => setSidebarMode('active')}
          >
            {t('navActive')}
          </Button>
          <Button
            size="sm"
            variant={sidebarMode === 'archived' ? 'primary' : 'ghost'}
            className="flex-1"
            onPress={() => setSidebarMode('archived')}
          >
            {t('navArchived')}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-3 pt-2">
          {projects.isLoading ? (
            <p className="text-muted px-2 text-xs">{t('loading')}</p>
          ) : sidebarProjects.length === 0 ? (
            <p className="text-muted px-2 text-xs">
              {sidebarMode === 'archived' ? t('emptyArchived') : t('empty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {sidebarDragEnabled ? (
                <li className="text-muted px-2 pb-1 text-[10px]">{t('sidebar.dragHint')}</li>
              ) : null}
              {sidebarProjects.map((p: ProjectView) => (
                <li
                  key={p.id}
                  draggable={sidebarDragEnabled}
                  onDragStart={(e) => onSidebarDragStart(p.id, e)}
                  onDragOver={(e) => {
                    if (!sidebarDragEnabled) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => onSidebarDropBefore(p.id, e)}
                  className={cn(sidebarDragEnabled && 'cursor-grab active:cursor-grabbing')}
                >
                  <Link
                    to={`/manage/project/${p.id}`}
                    className={cn(
                      'flex items-center truncate rounded-lg px-2 py-2 text-sm',
                      p.id === projectId
                        ? 'bg-accent-soft text-accent-soft-foreground'
                        : 'text-muted hover:bg-default hover:text-foreground',
                    )}
                  >
                    {p.topAt ? (
                      <StarIconSolid className="text-accent me-1 size-3.5 shrink-0" aria-hidden />
                    ) : null}
                    <span className="min-w-0 truncate">
                      {p.name}
                      {p.isPersonal ? (
                        <span className="text-muted ms-1 text-[10px]">{t('personal')}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border flex flex-col gap-3 border-b px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {project.isLoading ? (
                <p className="text-muted text-sm">{t('loading')}</p>
              ) : project.isError || !project.data ? (
                <div className="flex items-center gap-2">
                  <p className="text-danger text-sm">{t('error')}</p>
                  <Button size="sm" variant="secondary" onPress={() => void project.refetch()}>
                    {t('retry')}
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="truncate text-xl font-semibold tracking-tight">
                    {project.data.name}
                  </h1>
                  <p className="text-muted mt-1 text-xs">
                    {project.data.isPersonal ? t('personal') : t('team')}
                    {' · '}
                    {ownerLabel(project.data.myOwner, t)}
                    {project.data.departmentReadonly ? ` · ${t('readonly')}` : ''}
                    {isArchived ? ` · ${t('archive.badge')}` : ''}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                isIconOnly
                aria-label={favorited ? t('detail.unfavorite') : t('detail.favorite')}
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
                isIconOnly
                aria-label={pinned ? t('settings.unpin') : t('settings.pin')}
                onPress={onToggleTop}
                isDisabled={toggleTop.isPending}
              >
                {pinned ? (
                  <BookmarkIconSolid className="text-accent size-4" aria-hidden />
                ) : (
                  <BookmarkIcon className="size-4" aria-hidden />
                )}
              </Button>
              <ProjectLogsModal projectId={projectId} />
              <Button size="sm" variant="secondary" onPress={onExportCsv}>
                {t('export.menu')}
              </Button>
              {isOwner ? (
                isArchived ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={archiveProject.isPending}
                    onPress={() => onArchiveProject('recovery')}
                  >
                    {t('archive.recover')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    isDisabled={archiveProject.isPending}
                    onPress={() => onArchiveProject('add')}
                  >
                    {t('archive.menu')}
                  </Button>
                )
              ) : null}
              {project.data && !project.data.departmentReadonly && !isArchived ? (
                <>
                  <ProjectSettingsModal
                    project={project.data}
                    canEdit={project.data.myOwner >= 1}
                    isOwner={isOwner}
                    onRemoved={() => navigate('/manage/project')}
                  />
                  <ProjectMembersModal project={project.data} />
                  <ProjectPermissionModal
                    projectId={projectId}
                    isPersonal={Boolean(project.data.isPersonal)}
                    canEdit={project.data.myOwner >= 1}
                  />
                  <ProjectFlowModal
                    projectId={projectId}
                    isPersonal={Boolean(project.data.isPersonal)}
                    canEdit={project.data.myOwner >= 1}
                  />
                  <ProjectTagsModal projectId={projectId} canEdit={project.data.myOwner >= 1} />
                  <ProjectColumnsModal
                    projectId={projectId}
                    canAdd={canAddColumn}
                    canUpdate={canUpdateColumn}
                    canRemove={canRemoveColumn}
                    canSort={canSortColumns}
                  />
                </>
              ) : null}
              <RadioGroup
                name="project-view"
                orientation="horizontal"
                value={view}
                onChange={(v) => {
                  if (projectId) setView(projectId, v as ViewMode);
                }}
              >
                <Label className="sr-only">{t('views.board')}</Label>
                <Radio value="board">
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    {t('views.board')}
                  </Radio.Content>
                </Radio>
                <Radio value="list">
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    {t('views.list')}
                  </Radio.Content>
                </Radio>
                <Radio value="gantt">
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    {t('views.gantt')}
                  </Radio.Content>
                </Radio>
                <Radio value="workflow">
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    {t('views.workflow')}
                  </Radio.Content>
                </Radio>
              </RadioGroup>
              <Switch
                isSelected={showCompleted}
                onChange={(v) => {
                  if (projectId) setShowCompleted(projectId, v);
                }}
                className="text-xs"
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Label>{t('toolbar.showCompleted')}</Label>
                </Switch.Content>
              </Switch>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <TextField
              aria-label={t('toolbar.search')}
              value={search}
              onChange={setSearch}
              className="min-w-48 flex-1 sm:max-w-xs"
            >
              <Input placeholder={t('toolbar.search')} />
            </TextField>
            <Select
              className="w-40"
              value={columnFilter > 0 ? String(columnFilter) : 'all'}
              onChange={(key) => {
                const raw = String(key ?? 'all');
                setColumnFilter(projectId, raw === 'all' ? 0 : Number(raw) || 0);
              }}
            >
              <Label className="sr-only">{t('toolbar.columnFilter')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue={t('toolbar.columnAll')}>
                    {t('toolbar.columnAll')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {(columns.data ?? []).map((col: ProjectColumnView) => (
                    <ListBox.Item key={col.id} id={String(col.id)} textValue={col.name}>
                      {col.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              className="w-40"
              value={priorityFilter}
              onChange={(key) => {
                setPriorityFilter(
                  projectId,
                  (String(key ?? 'all') as ProjectPriorityFilter) || 'all',
                );
              }}
            >
              <Label className="sr-only">{t('toolbar.priorityFilter')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue={t('toolbar.priorityAll')}>
                    {t('toolbar.priorityAll')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="unset" textValue={t('toolbar.priorityUnset')}>
                    {t('toolbar.priorityUnset')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {priorityOptions.map(([level, name]) => (
                    <ListBox.Item key={level} id={String(level)} textValue={name}>
                      {name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            {filtersActive ? (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  setSearch('');
                  setColumnFilter(projectId, 0);
                  setPriorityFilter(projectId, 'all');
                }}
              >
                {t('toolbar.clearFilters')}
              </Button>
            ) : null}
            <span className="text-muted ms-auto text-xs">
              {filtersActive
                ? t('toolbar.filteredCount', {
                    shown: taskList.length,
                    total: totalVisible,
                  })
                : t('toolbar.allCount', { count: taskList.length })}
            </span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
          {batchEnabled ? (
            <ProjectBatchBar
              projectId={projectId}
              selectedIds={[...selectedIds]}
              columns={columns.data ?? []}
              visibleIds={taskList.map((x) => x.id)}
              onClear={clearSelection}
              onSelectVisible={selectVisible}
              canComplete={canBatchComplete}
              canArchive={canBatchArchive}
              canMove={canBatchMove}
            />
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">
            {(columns.isLoading || tasks.isLoading) && !columns.data ? (
              <p className="text-muted text-sm">{t('loading')}</p>
            ) : null}
            {(columns.isError || tasks.isError) && (
              <div className="mb-3 flex items-center gap-2">
                <p className="text-danger text-sm">{t('error')}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    void columns.refetch();
                    void tasks.refetch();
                  }}
                >
                  {t('retry')}
                </Button>
              </div>
            )}

            {view === 'board' ? (
              (columns.data?.length ?? 0) === 0 && !columns.isLoading ? (
                <p className="text-muted text-sm">{t('board.noColumns')}</p>
              ) : taskList.length === 0 && filtersActive ? (
                <p className="text-muted text-sm">{t('toolbar.noMatch')}</p>
              ) : (
                <ProjectBoard
                  projectId={projectId}
                  columns={
                    columnFilter > 0
                      ? (columns.data ?? []).filter((c) => c.id === columnFilter)
                      : (columns.data ?? [])
                  }
                  byColumn={byColumn}
                  draftByColumn={draftByColumn}
                  setDraftByColumn={setDraftByColumn}
                  onAddTask={onAddTask}
                  onOpenTask={openTask}
                  createPending={createTask.isPending}
                  canAddTask={canAddTask}
                  taskDragEnabled={canDragTasks}
                  columnDragEnabled={canSortBoardColumns}
                  batchEnabled={batchEnabled}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              )
            ) : view === 'gantt' ? (
              taskList.length === 0 && filtersActive ? (
                <p className="text-muted text-sm">{t('toolbar.noMatch')}</p>
              ) : (
                <ProjectGantt
                  tasks={taskList}
                  onOpenTask={openTask}
                  batchEnabled={batchEnabled}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              )
            ) : view === 'workflow' ? (
              flows.isLoading ? (
                <p className="text-muted text-sm">{t('loading')}</p>
              ) : flows.isError ? (
                <div className="flex items-center gap-2">
                  <p className="text-danger text-sm">{t('error')}</p>
                  <Button size="sm" variant="secondary" onPress={() => void flows.refetch()}>
                    {t('retry')}
                  </Button>
                </div>
              ) : flowItems.length === 0 ? (
                <p className="text-muted text-sm">{t('workflow.empty')}</p>
              ) : (
                <ProjectWorkflow
                  projectId={projectId}
                  items={flowItems}
                  byFlowItem={byFlowItem}
                  onOpenTask={openTask}
                  dragEnabled={canDragWorkflow}
                  batchEnabled={batchEnabled}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
              )
            ) : taskList.length === 0 ? (
              <p className="text-muted text-sm">
                {filtersActive ? t('toolbar.noMatch') : t('list.empty')}
              </p>
            ) : (
              <Table variant="secondary" className="w-full">
                <Table.ScrollContainer>
                  <Table.Content
                    aria-label={t('views.list')}
                    className="min-w-140"
                    selectionMode={batchEnabled ? 'multiple' : 'none'}
                    selectedKeys={batchEnabled ? new Set([...selectedIds].map(String)) : undefined}
                    onSelectionChange={(keys) => {
                      if (!batchEnabled) return;
                      if (keys === 'all') {
                        selectVisible();
                        return;
                      }
                      setSelectedIds(
                        new Set(
                          [...keys]
                            .map((k) => Number(k))
                            .filter((n) => Number.isFinite(n) && n > 0),
                        ),
                      );
                    }}
                  >
                    <Table.Header>
                      <Table.Column isRowHeader id="name">
                        {t('list.colName')}
                      </Table.Column>
                      <Table.Column id="column">{t('list.colColumn')}</Table.Column>
                      <Table.Column id="priority">{t('list.colPriority')}</Table.Column>
                      <Table.Column id="owners">{t('list.colOwners')}</Table.Column>
                      <Table.Column id="tags">{t('list.colTags')}</Table.Column>
                      <Table.Column id="due">{t('list.colDue')}</Table.Column>
                    </Table.Header>
                    <Table.Body items={taskList}>
                      {(task: TaskView) => {
                        const colName =
                          (columns.data ?? []).find(
                            (c: ProjectColumnView) => c.id === task.columnId,
                          )?.name ?? '—';
                        return (
                          <Table.Row id={String(task.id)} textValue={task.name}>
                            <Table.Cell>
                              <Button
                                variant="ghost"
                                className={cn(
                                  'h-auto min-h-0 px-0 py-0 text-sm font-normal',
                                  task.completeAt && 'text-muted line-through',
                                )}
                                onPress={() => openTask(task.id)}
                              >
                                {task.name}
                              </Button>
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-muted">{colName}</span>
                            </Table.Cell>
                            <Table.Cell>{task.priorityName || '—'}</Table.Cell>
                            <Table.Cell>
                              <TaskOwnerChips
                                projectId={projectId}
                                ownerUserIds={task.ownerUserIds}
                                max={3}
                              />
                            </Table.Cell>
                            <Table.Cell>
                              <TaskTagDots projectId={projectId} tagIds={task.tagIds} />
                            </Table.Cell>
                            <Table.Cell>
                              <span className="text-muted">
                                {task.endAt ? new Date(task.endAt).toLocaleDateString() : '—'}
                              </span>
                            </Table.Cell>
                          </Table.Row>
                        );
                      }}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
