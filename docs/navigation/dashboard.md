# 仪表盘（dashboard）

路由：`/manage/dashboard` · 优先级：P0 · 前端状态：wip

## 范围

登录后任务工作台。

- **个人视角**（所有用户）：负责 / 协助任务聚合。
- **部门负责人视角**（可选）：系统开启且用户管理至少一个部门时；只读总览，不授予改任务权限。

## 个人视角

- 顶部卡片：已超期、今日到期、待完成（可提示待开始数）、我协助的。
- 布局：列表分组或四象限；分组可收起。
- 列表分组含：已超期 / 今日到期 / 待完成 / **待开始** / 我协助的 / **本周完成**（四象限不含待开始与本周完成）。
- 点任务打开详情（Modal 或 `/single/task/:taskId`）。
- 支持刷新。

## 部门负责人视角

- 指标：未完成、已超期、3 天内到期、本周完成。
- **优先级分布**（`team/stats.priority`）。
- **成员范围**：人数 + 按成员筛选任务（`memberId`）；筛选后展示该成员 **参与项目**（`project/user/projects`，含部门只读标记）与任务。
- 下钻：已超期 / 3 天内到期 / **高优任务**（`type=hi`）。
- 切换视角不改变写权限。

## 本地记忆

视角、布局、筛选、分组收起存 `localStorage`（按用户隔离），不同步多设备。实现：`packages/app/src/stores/dashboard.ts` + `stores/persist.ts`。

## React 要点

- `features/dashboard/DashboardPage`：TanStack Query 聚合；Zustand persist 布局。
- 个人列表：`user/tasks` 分 `uncompleted` / `completed`；待开始 = `startAt` 晚于当前；本周完成 = `completeAt` 落在本周一至下周一。
- 负责人态禁用编辑入口。
- 任务点击打开 `TaskModal`（与项目页共用；Modal 内可「独立打开」）。

## API（blue-dock-java）

[modules/dashboard](../../../blue-dock-java/docs/modules/dashboard/) · [guide/api.md](../guide/api.md)

| 能力     | 接口                       |
| -------- | -------------------------- |
| 团队统计 | `GET dashboard/team/stats` |
| 团队任务 | `GET dashboard/team/tasks` |
| 个人计数 | `GET project/user/counts`  |
| 个人任务 | `GET project/user/tasks`   |
| 会员项目 | `GET project/user/projects` |
