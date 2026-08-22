# 文件（file）

路由：`/manage/file/:folderId?/:fileId?` · 独立：`/single/file/*` · 优先级：P0 · 前端状态：wip

## 能力

- 个人目录树 / 共享空间。
- 上传（分片，见 [upload.md](../guide/upload.md)）、新建、重命名、移动、删除。
- 预览、历史版本、搜索、回收站恢复。
- 共享与公开链接（分享码）；Office 类预览 token。
- 消息内文件 / 任务附件经 single 路由打开（消息附件可预览图 / 下载 / 回会话）。

## 已落地（骨架）

- `FilePage`：目录列表、**名称搜索**、新建文件夹、**上传**、**重命名**、**移动 / 复制**、**共享成员**、**发送到会话**（`sendFileId` + `users/share/list`）、删除、详情、**收藏**；**复制公开分享链接**；**单文件下载**（`file/raw`）/ **文件夹与多选打包**（`file/download/pack`）；**文本编辑保存**（`content/save`）/ **上传替换**（分片会话 + `content/upload`；`content` 失败时 `file/fetch` 回退）/ 图片 / **PDF 预览**（`file/raw`）/ **Office 预览与编辑**（`office/token` mode）；**文本内容历史 / 恢复**；**回收站**。
- `SingleFilePage`：`/single/file/:codeOrFileId`（码/ID）· 任务附件 · **消息附件**（`dialog/message/detail` + `download`：图预览 / 下载 / 回会话 `?msg=`）；登录后同预览分支（图 / PDF / Office）。
- 后端：`GET api/file/raw` 鉴权流式读二进制（图片预览）；`GET api/file/download/pack` 打包 zip；Office 依赖 OnlyOffice Document Server。

## Single

| path                         | 用途                         |
| ---------------------------- | ---------------------------- |
| `/single/file/:codeOrFileId` | 分享码或文件 ID              |
| `/single/file/msg/:msgId`    | 消息附件预览 / 下载 / 回会话 |
| `/single/file/task/:fileId`  | 任务附件                     |

## React 要点

- `features/file`：树 + 内容区；上传进度本地态。
- 预览组件与 messenger / task 复用。
- UI 优先 HeroUI（见 `.agents/rules/components.md`）。

## API

[modules/file](../../../blue-dock-java/docs/modules/file/) · [upload](../../../blue-dock-java/docs/modules/upload/)
