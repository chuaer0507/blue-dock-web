# 即时通讯（messenger）

路由：`/manage/messenger/:dialogAction?` · 独立窗：`/single/dialog/:dialogId` · 优先级：P0 · 前端状态：wip（契约主路径已齐；OKR 评论群 `okr/add`·`okr/push` + 微应用桥已接）

## 会话类型

私聊 · 普通群 · 项目群 · 任务群 · **OKR 评论群** · 机器人单聊。

## 能力

- 会话列表：未读、置顶、免打扰、搜索。
- 单聊在线态：`GET users/presence` + WS `presence.*`（桌面活跃 `pcActive`）；会话列表头像绿点 + 头栏文案。
- OKR 评论群：`POST dialog/okr/add` · `okr/push`；微应用桥 `okrAdd` / `okrPush` / `openDialog`；会话头「打开 OKR」。
- 消息：文本、图片、文件、任务卡片、引用、撤回、@提及。
- 群：建群（含头像）、成员、改头像、转让、解散、退出、禁言（权限见后端）。
- 会话列表展示真实头像（`DialogView.avatar` + `resolveAvatarSrc`）。
- 群互动：投票、接龙。
- 待办消息、已读回执、历史翻页（`beforeId`）。
- 语音红点（`message/dot`）、跳至未读（`message/unread` + `lastReadMessageId`）。
- 消息待办：会话内设/取消/完成/提醒；未选会话时展示**全局待办**（含完成/取消/提醒；点击带 `?msg=` 定位）。
- AI 机器人单聊多会话（`dialog/session/*`）。
- 多会话增量补洞（`message/latest`；WS 重连 + 断线轮询）。
- 附件消息详情（`message/detail`；file/image 补全网盘元数据）。
- 流式消息（`message/stream` + WS `dialog.message.stream` → SSE 补丁）。
- 深链会话详情（`dialog/one`）、跟读已读（`message/read`）、机器人 `open/event`。
- 深链 `dialogAction`：数字会话 id；`createGroup` / `addProject` 触发建群 / 建项弹层（`blue-dock:new-group` / `blue-dock:new-project`）；`?msg=` 定位并高亮消息（必要时向前翻历史）。
- 免打扰：服务端 mute 成功后写入本地 `mutedDialogIds`（persist），供桌面通知跳过。
- Electron：可 popout 独立对话窗（`desktop.openWindow` → `/single/dialog/:id`；标题、跟读已读、加载更早、文本/附件/粘贴图；`?msg=` 定位）。

## 已落地（骨架）

- `MessengerPage`：会话列表、**会话搜索**、**个人标签搜索**（`search/tag`）、**列表外（隐藏）找回**、**类型筛选**（含 **OKR**；机器人单聊经 `dialog/user` + `users/search?isBot=2` 富化）、**新建群聊**、**匿名消息**（`sendAnon` + 选人）、**机器人私信**（`sendBot`）、**AI 系统机器人开聊**（`users/search/ai` → `dialog/user`）、**审批卡片**（`sendApprove`）、**群发文件**（`sendFiles` + 分享选择器）、**发公告**（`sendNotice`）、**模板卡片**（`sendTemplate`）、**AI 助手发信**（`sendAiAssistant`）、**普通群管理**（改名/加人/踢人/管理员/转让/退出/解散）、**群禁言**、文本消息、**文本清单勾选**（`message/checked`）、**历史翻页**（`message/list` + `beforeId`）、**增量补洞**（`message/latest`）、**跳至未读**（`message/unread`）、**消息待办**（设/取消/完成/**提醒时间**；未选会话时 **全局 todoList**；**含已完成** `includeDone`）、**表情回复**、**消息置顶**、**转发**、**合并转发（多选）**、**消息标注**、**消息翻译**、**在线表情**、**发送位置**（`sendLocation`）、**语音**（`sendRecord` / 播放 / `voiceToText` / **`convertRecord` 预转写入草稿** / **播放清红点 `message/dot`**）、**AI 机器人多会话**（`session/*`）、**会话个人标签**、**Markdown 工具条**（加粗/斜体/代码/链接/**清单项**）、**附件直传**、**粘贴图片**（`image64`，≤5MB）、**投票 / 接龙**、**撤回**、**已读回执**、**引用回复**、**@提及**、**#任务引用**（搜索 + **面板内速建**）、**会话内开会**、**举报会话**、发送（⌘/Ctrl+Enter）、**下一条未读**（⌘/Ctrl+Shift+U）、已读标记、置顶、**免打扰**、**标记未读**、**隐藏会话**、**收藏**、草稿 persist；单聊展示**在线态**（`users/presence` + WS）、**共同群**（`common/list`）与**查看电话**（`telephone`）；**OKR 评论群**头栏「打开 OKR」；**机器人单聊只读输入区**；禁言时普通成员只读。
- 微应用桥：`okrAdd` / `okrPush` / `openDialog`（OKR 插件经 postMessage 创建评论群、推送提醒、跳转会话）。
- `ChecklistMessageBody`：本人文本消息中 `<li data-list>` 可勾选（契约 `dialog/message/checked`）。
- 语音气泡：对方未听时展示红点；首次播放调用 `dialog/message/dot` 清除（消息视图无 `dot` 字段时，会话内首次播放前本地展示）。
- 文件 / 图片气泡：body 缺 size/name 时拉 `dialog/message/detail` 补全扩展名与大小。
- `DialogTelephoneButton`：查看单聊对方电话（契约 `dialog/telephone`；会写入审计 notice）。
- `DialogSessionPanel`：AI 机器人单聊（`ai-*@bot.system`）新建 / 历史 / 切换 / 重命名（契约 `dialog/session/*`）；头栏展示**当前会话标题**；切换会刷新消息列表。**消息列表仍按整对话返回**（java `message/list` 未按 `session_key` 过滤；待后端落库后可真隔离）。
- `SendAiAssistantModal`：当前会话以 AI 助手机器人发 Markdown（契约 `dialog/message/sendAiAssistant`）。
- `SendNoticeModal` / `SendTemplateModal`：公告与模板卡片；均可勾选 **silence** 静默发送（不推未读）。
- `SendApproveModal`：选人发审批模板卡片（契约 `dialog/message/sendApprove`；气泡按 approve_* 展示）。
- `SendBotMessageModal`：选人 + 机器人类型发 markdown 私信（契约 `dialog/message/sendBot`）。
- `CommonGroupsModal`：与对方的共同普通个人群列表（契约 `dialog/common/list`；可跳转会话）。
- `BroadcastFilesModal`：本地多文件群发到多会话（契约 `dialog/message/sendFiles`；目标经 `users/share/list`）。
- `ComplaintSubmitModal`：成员举报会话（契约 `complaint/submit`；类型 10–70；可选附图 `images.path`）。
- `GroupManageModal`：普通个人群设置（契约 `dialog/group/*`，含管理员任命/罢免）。
- 管理后台「个人群检索」：`dialog/group/searchUser`（系统管理员）。
- `MessageTodoRemindModal`：待办提醒时间（契约 `dialog/message/todoRemind`）。
- `MessageEmojiBar`：快捷表情聚合（契约 `dialog/message/emoji` · `emojiMap`）。
- `MessageForwardModal`：逐条转发到多会话（契约 `dialog/message/forward`；目标经 `users/share/list`）。
- `MessageMergeForwardModal`：合并转发到单会话（契约 `dialog/message/mergeForward`；目标经分享选择器）。
- `MessageMergeDetail`：合并转发气泡预览 + 详情弹层（契约 `dialog/message/mergeDetail`）。
- `MessageTranslatePanel`：文本/语音转写翻译（契约 `dialog/message/translation`，目标语=当前 UI 语言）。
- `StickerPickerPanel`：在线表情搜索与发送（契约 `dialog/sticker/search` · `dialog/message/sendSticker`）。
- `DialogTagField`：会话个人标签（契约 `dialog/config/save` · `search/tag`）。
- `DialogColorField`：会话个人颜色（契约 `dialog/message/color`）。
- `MessageContent` / `MentionedBody`：按 `type` 分发；**图片消息内联预览**（`dialog/message/download`）；文本 @/# 提及 + 行内 Markdown 渲染（任务可点开）；**导出 CSV 链接**（`…/download?key=`）走鉴权下载，不裸开 `/api`；**会议卡片 `endAt` 已结束态**；**任务 AI `:::ai-action` 卡片**可采纳 / 忽略。
- 任务详情「发送到会话」：`dialog/message/sendTaskId` + `ShareTargetPicker`（可选附言）。
- `MessageImagePreview`：会话成员鉴权拉图（勿用 `file/raw`，对端不可读）。
- `TaskSuggest`：`#` 面板搜索；无匹配时可速建（项目群预填 `linkId`，否则选项目；`TASK_ADD` 门控）并插入 `[:#:id:name:]`。
- `SingleDialogPage`：独立窗消息列表 + 会话标题 + 文本发送（⌘/Ctrl+Enter）；完整能力跳转 Manage 页。
- `dialogAction` 为数字会话 id。

## 实时

WebSocket 推送消息 / 未读；HTTP 首屏与补洞。协议对齐 java `architecture/realtime.md`。`dialog.message.withdraw` 本地补丁移除消息。WS 重连后对缓存会话调用 `dialog/message/latest` 增量合并；断线时消息列表 `refetchInterval: 5000`。`dialog.message.stream` 订阅 SSE（`append`/`replace`/`done`）并按 messageId 补丁正文。

## React 要点

- `features/messenger`：会话列表 Query + 消息分页；草稿 Zustand（`stores/messenger.ts`）。
- 消息体为 Markdown 文本（对齐 java）；编辑器用标记插入，展示用安全行内子集（无 HTML）。

## API

[modules/messenger](../../../blue-dock-java/docs/modules/messenger/)
