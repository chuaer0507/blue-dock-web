# 分片上传（upload）

优先级：P0 · 横切能力（文件 / 任务附件 / 人脸等复用）· 状态：done

## 范围

大文件分片：`init` → `chunk` → `merge` / `cancel`。≥10MB 自动分片；同 hash 可秒传。

场景：`file_cabinet`（网盘）、`project_task`（任务附件，需 `taskId`）。

小文件亦可走 `api/system/fileUpload` / `imageUpload` 或 `dialog/message/sendFile`。

## 前端

- 小文件 / 图片直传：`http-api.upload`（如 `system/imageUpload`、`system/fileUpload`、`system/uploads`、`dialog/message/sendFile`、`users/import/preview`）。
- 本人图片空间：`GET system/imageView` → `useSystemImageView` / `ImageSpacePicker`（个人资料与机器人头像选图）。
- 大文件分片：`packages/api/src/upload` → `uploadCabinetFile` / `uploadCabinetSession`（仅齐备分片，供 `file/content/upload`）/ `uploadTaskFile`；`cancelUpload`；分片请求也走 `upload()`。
- **本机续传**：`localStorage` 键 `blue-dock:upload-sessions` 存 `uploadId` + 已收分片；中断后再选同文件（同 hash/size/scene/目录或任务）跳过已传片。不跨设备。
- **取消**：UI Abort + `upload/cancel` 清服务端会话并删本机索引；仅 Abort 不点取消则保留索引以便续传。
- 入口：`FilePage`、`TaskDetail` 进度条旁「取消上传」。

## API（blue-dock-java）

契约：[modules/upload/overview.md](../../../blue-dock-java/docs/modules/upload/overview.md) · [infra/upload.md](../../../blue-dock-java/docs/infra/upload.md)

| 路径                | HTTP |
| ------------------- | ---- |
| `api/upload/init`   | POST |
| `api/upload/chunk`  | POST |
| `api/upload/merge`  | POST |
| `api/upload/cancel` | POST |

大小上限受 `fileSetting.uploadMaxMb` 等系统设置约束；存储引擎见 OSS 设置。

业务侧只提交合并后的 objectId / 文件记录。

[guide/api.md](../guide/api.md)
