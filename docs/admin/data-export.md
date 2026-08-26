# 数据导出（data-export）

路由：`/manage/export` · 应用中心「数据导出」· 优先级：P1 · 前端状态：wip

## 能力

- 管理员：成员搜索选人（最多 100）+ 时间范围快捷「本月 / 上月」。
- 导出任务统计（任务时间 / 创建时间）、超期任务、签到数据、审批数据。
- 异步受理后系统消息（`system-msg`）推送下载链接（`key` **24h**、仅本人）。
- 消息内导出链接经 **Bearer** 鉴权拉 CSV（`ExportDownloadLink` / `parseExportDownloadRef`），勿直接打开裸 `/api/…`。

## API

| 方法 | 路径                         | 说明              |
| ---- | ---------------------------- | ----------------- |
| GET  | `project/task/export`        | 任务统计异步导出  |
| GET  | `project/task/exportOverdue` | 超期任务异步导出  |
| GET  | `project/task/download?key=` | 任务导出 CSV 下载 |
| GET  | `system/attendance/export`   | 签到异步导出      |
| GET  | `system/attendance/download` | 签到导出 CSV 下载 |
| GET  | `approve/export`             | 审批异步导出      |
| GET  | `approve/download`           | 审批导出 CSV 下载 |
| GET  | `users/search`               | 选人搜索          |

契约：[modules/data-export](../../../blue-dock-java/docs/modules/data-export/)
