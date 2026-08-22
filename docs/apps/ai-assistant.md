# AI 助手（ai-assistant）

Java feature：`assistant` · 优先级：P0 · 前端状态：wip

## 能力

- Manage 壳内助手浮层（FAB；`Cmd/Ctrl+I` 开关；无可用模型时隐藏 FAB）。
- 模型选择、快捷提示、SSE 流式回答与停止（`assistant/auth` + stream；上送 `locale`）。
- 回复反馈：赞 / 踩 / 再点取消（`assistant/feedback/save`，`localId` 会话内序号）。
- 输入时 **页面元素匹配**（`matchElements` + `log/search`）；命中主导航可跳转。
- WS **操作派发**：下行 `operation` → 本端 `get_page_context` / `navigate` → 上行 `operationResult`（`operation/dispatch|result`）。
- 新对话 / 历史会话列表 / 单条删除 / 清空（`session/list|save|delete`，sessionKey=`default`）。
- 会话配图：发送前可附加图片，随 `session/save` 的 `newImages` 落盘（data URL，≤20 张 / 单张 ≤5MB）。
- 管理员可配置 AI Bot（`/manage/admin/ai-bot`）：开关、密钥、**各供应商可见模型**（`openaiModels` 等）、「填入推荐」读 `aiBotDefaultModels`。

## API

[modules/assistant](../../../blue-dock-java/docs/modules/assistant/) · 设置见 java `system/setting/aiBot*`
