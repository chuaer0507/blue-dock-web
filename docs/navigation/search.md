# 全局搜索（search）

路由：`/manage/search` · 快捷键：⌘/Ctrl+K · 优先级：P0 · 前端状态：wip（防抖聚合 / 深链 / 跳转）

## 能力

- 统一入口搜索：联系人、项目、任务、文件、消息（`useSearchAll`）。
- 结果跳转：项目/任务/文件直达；联系人 `dialog/open/user`；消息经 `dialog/message/one` 取 `dialogId` 后进会话并带 `?msg=` 定位。
- URL `?q=` 与输入同步（可分享/刷新保留关键词）。
- 管理员可触发搜索索引重建（可选按类型 `types`：contact/project/task/file/message）。

## React 要点

- `features/search/SearchPage`：`SearchField` + 300ms 防抖 + `useSearchAll`；空态 / 无结果 / 错误重试。
- Manage 壳监听 ⌘/Ctrl+K 跳转本页。

## API

[modules/search](../../../blue-dock-java/docs/modules/search/)
