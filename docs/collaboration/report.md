# 工作报告（report）

路由：`/manage/report` · 独立：`/single/report/edit|detail/:id` · 优先级：P0 · 前端状态：wip（列表 / 撰写含选人 / 详情含 **AI 解读** / 分享短码 / 统计分析）

## 能力

- 日报 / 周报；我提交的 / 我收到的。
- 编辑、详情；任务模板填充；**周期 offset**（本周期 / 上一周期）；AI 整理（后端可用时）；接收人 **搜索选人**。
- **分享到会话**（`report/share`；目标经 `users/share/list`）；详情支持 **数字 id 或分享短码**。
- **AI 解读**（`report/analysisSave`；详情带出 `aiAnalysis`）。
- **统计分析**（客户端汇总最近 my/receive；未读走 `report/unread`）。
- Electron / 桌面可独立编辑窗。

## React 要点

- `features/report`：`ReportPage` · `ReportComposeForm` · `ReportDetailPage`（含分享 Modal + `ReportAnalysisPanel`）· `ReportEditPage` · `ReportStatsPanel`

## API

[modules/report](../../../blue-dock-java/docs/modules/report/)
