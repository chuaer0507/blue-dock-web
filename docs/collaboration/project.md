# 项目（project）

路由：`/manage/project` · `/manage/project/:projectId` · 邀请：`/manage/project/invite/:inviteId?` · 优先级：P0 · 前端状态：done

## 能力

- 个人 / 团队项目；角色 owner / admin / member。
- 创建、编辑、归档、删除、移交、退出、**置顶**；新建可套用系统**列模板**。
- 成员管理、邀请链接落地。
- **成员弹层可生成/复制邀请链接**（`project/invite`；个人项目不可用）。
- 列（看板列）CRUD、工作流、**项目标签**、排序、置顶；列管理按 `TASK_LIST_*` **细粒度**门控（增/改/删/排序分权）。
- 权限矩阵（见 [role-permission.md](../org/role-permission.md)）；项目页已门控：`TASK_ADD` 快建、`TASK_MOVE` 看板拖、`TASK_STATUS` 工作流拖与批量完成、`TASK_ARCHIVED`/`TASK_MOVE` 批量、`TASK_LIST_*` 列管理；部门只读 / 归档项目关闭编辑。
- 侧栏项目列表、归档列表、负责人视角入口（与仪表盘联动）。
- **侧栏拖拽排序**（`project/user/sort`，仅本人；进行中列表可拖）。
- 项目日志、导出。

## 已落地（骨架）

- 索引页自动跳转首个项目 / 空态创建。
- 详情页：侧栏切换、看板快建任务、**看板拖拽换列/排序**、**看板列管理**、列表视图、甘特、**工作流视图**、**工作流配置编辑**、**项目标签管理**、**搜索 / 列 / 优先级筛选**、完成筛选、**收藏开关**、**批量操作**。
- **项目设置**（名称 / 描述 / 归档策略 / AI·模板·部门负责人开关；拥有者可软删）；**置顶**（`project/top`）。
- **侧栏进行中 / 已归档**；拥有者可归档 / 恢复（`project/archived`）；进行中列表可拖拽排序（`project/user/sort`）。
- **项目动态**（`project/log/lists` 分页弹层）；**导出当前任务 CSV**（客户端；全站异步导出见 `/manage/export`）。
- **成员管理**（加人 / 移除 / 任命管理员 / 移交 / 退出）与 **权限矩阵**。
- 邀请落地页（可未登录查看摘要，加入需登录）；管理端在成员弹层生成链接。
- 看板 / 工作流卡片与列表展示**标签色点**（`TaskTagDots`）与**负责人头像**（`TaskOwnerChips`；列表接口回 `ownerUserIds` / `tagIds`）。
- 看板**列标题拖拽**重排列（`project/sort?onlyColumn=1`；亦可用「列管理」上下移）。

## 视图

看板 / 列表 / 甘特 / 工作流 — 见 [view.md](./view.md)。任务细则见 [task.md](./task.md)。

## React 要点

- `features/project`：详情壳 + 子视图；邀请页匿名/登录兼容。

## API

[modules/project](../../../blue-dock-java/docs/modules/project/)
