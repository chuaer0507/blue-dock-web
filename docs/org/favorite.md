# 收藏与最近（favorite）

路由：`/manage/favorite` · `/manage/recent` · 优先级：P0 · 前端状态：done（列表 / 备注 / 取消收藏 / 星标 / 最近浏览）

## 能力

- 收藏任务 / 项目 / 文件 / 会话；类型筛选、分页、清空、取消收藏、备注编辑。
- 列表标题按类型补洞（`task`/`project`/`file`/`message`）；失效显示「已删除」。
- 详情星标：`TaskDetail` / `ProjectPage` / `FilePage` / `MessengerPage`（`check` + `toggle`）。
- 最近打开：`task` / `file` / `task_file` / `message_file` / `dialog` 正确路由；缺目标 id 时按 `sourceType` 回退。
- 收藏 / 最近的 `message`、最近的 `dialog` → Manage 完整 IM（`/manage/messenger/:id`），不进独立窗。
- 任务详情打开时 `users/task/browseSave`；下载任务附件时 `project/task/fileDetail` 写入 `task_file` 最近。
- 头像菜单：最近任务 → `/single/task/:id`；收藏 / 最近打开入口。

## React 要点

- `FavoritePage` + `FavoriteTitle` · `RecentPage` · `navigate.ts`（`openFavoriteTarget` / `openRecentTarget`）。

## API

[modules/favorite](../../../blue-dock-java/docs/modules/favorite/) · [user-favorites](../../../blue-dock-java/docs/modules/user-favorites/)
