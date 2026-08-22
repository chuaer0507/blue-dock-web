# 会议（meeting）

路由：`/meeting/:meetingId?/:sharekey?` · 应用中心「在线会议」· 优先级：P0 · 前端状态：wip（大厅 + Agora RTC + 会话发起）

## 能力

- 创建 / 加入会议；邀请与分享链接。
- 访客 `sharekey` 入会。
- Agora RTC：join / 本地音视频 / 远端订阅（`agora-rtc-sdk-ng`）；远端标签经 `tourist` 解析昵称。
- **即时通讯会话内「开会」**：对会话成员 `create` + `userIds`（最多 20），投递会议卡片并新开会议页。
- 会话内会议卡片：关房后卡片 JSON 含 `endAt` → 展示「已结束」且不再提供加入链接；大厅入会若响应带 `endAt` 则拦截。
- 管理员会议设置：`/manage/admin/meeting`。

## 已落地

- `MeetingPage`：大厅创建 / 加入；**搜索选人邀请**（`users/search` → `open` / `invitation`，≤20）；复制分享链接；RTC。
- `MessengerPage` 头部「开会」→ `useOpenMeeting` + `useDialogMemberIds`。
- `MessageContent` `type=meeting`：进行中可加入；`endAt` 已结束态。

## API

[modules/meeting](../../../blue-dock-java/docs/modules/meeting/)
