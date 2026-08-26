# 视图（view）

隶属项目页 · 优先级：P0 · 前端状态：done（看板 + 列表 + 甘特 + 工作流 + 批量操作 + 负责人展示）

## 类型

| 视图   | 说明                                   | 状态 |
| ------ | -------------------------------------- | ---- |
| 看板   | 列拖拽；触屏禁用拖拽改走详情           | done |
| 列表   | 表格 / 分组列表                        | done |
| 甘特   | 两周时间轴 + 起止日期条（无依赖）      | done |
| 工作流 | 按 `flowItem` 分列；拖拽调 `task/flow` | done |

## 能力

- 切换视图类型；**本地记忆每项目偏好**（`stores/project.ts`：视图 / 完成 / 列 / 优先级）。
- 看板 HTML5 拖拽换列 / 排序（`project/sort`）；**列标题拖拽重排列**（`onlyColumn`）；`tabbar` 下或筛选激活时禁用。
- **工作流视图**：`project/flow/list` 取节点；任务按 `flowItemId` 分组；拖拽调用 `useChangeTaskFlow`。
- **搜索**（ID / 名称 / 描述）+ **列筛选** + **优先级筛选**（客户端过滤已加载任务）。
- **批量操作**（非只读）：多选后完成 / 重开 / 归档 / 换列；列表用表格多选，看板 / 甘特 / 工作流用勾选；串行调用既有 task API。
- 列模板由系统设置下发；**工作流配置**：团队项目管理员可启用默认 5 节点、编辑节点 / 流转 / 绑定列（`flow/save` · `flow/delete`）。

## API

随 [project](../../../blue-dock-java/docs/modules/project/) / [task](../../../blue-dock-java/docs/modules/task/)
