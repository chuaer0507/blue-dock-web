# 角色权限（role-permission）

优先级：P0 · 前端状态：done（项目页权限矩阵）

## 能力

- 项目内角色矩阵：`project_member` / `task_leader` / `task_assist`。
- 拥有者 / 管理员可编辑；个人项目无矩阵。
- UI 按权限点隐藏 / 禁用操作 — 项目页已接入列管理细粒度、`TASK_ADD` / `TASK_MOVE` / `TASK_STATUS` / `TASK_ARCHIVED`（批量与拖拽）；任务详情已按角色并集门控 `UPDATE`/`TIME`/`STATUS`/`REMOVE`/`ARCHIVED`/`MOVE`/`ADD`。
- 与后端 permissions 契约一致，禁止前端私自放宽。

## API

[modules/role-permission](../../../blue-dock-java/docs/modules/role-permission/) · [project/permissions](../../../blue-dock-java/docs/modules/project/)
