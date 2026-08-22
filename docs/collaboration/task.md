# 任务（task）

入口：项目内 · Modal · `/single/task/:taskId` · `/single/task/content/:taskId` · 优先级：P0 · 前端状态：wip

## 能力

- 快建 / 全量创建；@ / # 快捷创建。
- 主任务 / 子任务；完成、换列、跨项目移动、排序。
- 负责人、协助、优先级、标签、颜色、可见性。
- **计划冲突简表**（`project/task/easyLists`：详情改期提示；日历拖拽改期确认）。
- 附件、关联、复制、模板、循环任务。
- 归档 / 删除 / 恢复；内容历史。
- **按动态恢复工作流**（`project/task/resetFromLog`：含 `record.flow` 的状态变更日志）。
- AI 建议（若后端开启）。
- WS 任务变更补洞 Query。

## 已落地

- `features/task/TaskDetail`：共用详情主体（编辑 / DatePicker / **计划冲突提示** / **优先级·颜色·可见性（指定成员勾选）** / **负责人·协助人勾选** / 收藏 / **browseSave** / 讨论 / 完成 / 流转 / **项目标签勾选** / 子任务 / **关联（搜索或 ID）** / **子任务升级主任务** / **换列·跨项目移动** / 附件（上传/下载含 fileDetail 最近/删除） / 动态（**含 flow 快照时可恢复**） / 归档 / **软删** / **复制** / **发送到会话**（`sendTaskId` + share/list） / **循环** / **模板套用·存为·默认·删除·排序·跨项目搜索** / **内容历史** / **AI 生成**；快捷键 ⌘/Ctrl+E 完成、Esc 关闭）。**权限**：对齐 java `ProjectPermissionService.allows`（`project_member` ∪ `task_leader`/`task_assist`）；门控 `TASK_UPDATE`/`TIME`/`STATUS`/`REMOVE`/`ARCHIVED`/`MOVE`/`ADD`；部门只读与归档项目禁编。
- `features/task/TaskDetailPage`：独立窗精简壳（`/single/task/:taskId` · `content` 变体）。
- `features/task/TaskModal`：项目内弹层入口（看板 / 列表 / 甘特 / 工作流）；可「独立打开」。
- `features/task/CreateTaskQuickModal`：应用中心「添加任务」快建（可选可见模板；按所选项目 `TASK_ADD` 门控）。

## React 要点

- 共用 `TaskDetail`；`variant: page | modal`；子任务在 Modal 内切换 `taskId`。
- Mutation：乐观更新 + 回滚 + `onSettled` 失效。
- 主任务 `content` / `contentHistory`：编辑区载入最新或指定历史；`update?content=` 追加版本。
- AI：`aiGenerate` 投递任务群 `:::ai-action` 卡片；messenger 内采纳 / 忽略（`aiApply` / `aiDismiss`）；描述/子任务/负责人由前端按 `result` 补洞。

## API

[modules/task](../../../blue-dock-java/docs/modules/task/)
