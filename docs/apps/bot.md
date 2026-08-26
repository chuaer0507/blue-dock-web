# 机器人（bot）

路由：`/manage/bot` · 应用中心「我的机器人」· 优先级：P0 · 前端状态：done

## 能力

- 创建 / 编辑 / 删除机器人（名称、头像 URL / **上传** / **图片空间选图**、消息保留天数、Webhook URL / 事件）。
- 列表展示 Avatar + `userId`，可一键复制；删除走 Modal + 必填备注（审计）。
- Webhook 事件：`message` / `dialogOpen` / `memberJoin` / `memberLeave`。
- **开始聊天**：`dialog/open/user`（bot `id` = 机器人 userId）→ `dialog/open/event`（触发 webhook）→ `/manage/messenger/:dialogId`。真人向机器人单聊发信由后端拒绝，页内可查看推送。
- Token / 指令模板消息以后端为准。

## API

[modules/bot](../../../blue-dock-java/docs/modules/bot/)
