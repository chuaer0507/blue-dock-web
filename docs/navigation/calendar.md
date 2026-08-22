# 日历（calendar）

路由：`/manage/calendar` · 优先级：P0 · 前端状态：wip

## 范围

以**任务起止时间**为数据源的日程视图（非独立日历实体）。支持月 / 周 / 日视图切换；拖拽或编辑改期走任务更新接口。

## 能力

- 展示负责范围内的任务块（后端按负责人过滤）。
- 点击打开任务详情（`TaskModal`；可再独立打开）。
- **月 / 周 / 日拖拽改期**（`useUpdateTaskDates`）；改期前校验 `TASK_TIME`（含 `task_leader`/`task_assist` 并集）+ `easyLists` 冲突确认；`tabbar` 触屏禁用拖拽。
- **全天 vs 定时**：按 `startAt`/`endAt` 自动判定（跨日或 00:00–23:59 → 全天；同日具体时段 → 时间轴块）。
- **周 / 日**：顶部全天条 + 24h 时段网格；点击空白时段或「全天任务」快建（所选项目须 `TASK_ADD`）。
- **客户端按项目筛选**（当前时间窗任务中的项目）。
- 本地记忆当前视图类型（`stores/calendar.ts`）。

## React 要点

- `features/calendar/CalendarPage`：Query `project/task/calendar`；HTML5 DnD 改期（冲突时 `easyLists` 确认）；快建走 `useCreateTask`（带 `startAt`/`endAt`）；点任务 / 快建成功打开 `TaskModal`。
- `date-utils`：`isAllDayOnDay` · `timedSlotOnDay`。
- 与仪表盘 / 项目视图共用任务详情入口。

## API

[modules/calendar](../../../blue-dock-java/docs/modules/calendar/) · 任务改期见 [task](../../../blue-dock-java/docs/modules/task/)
