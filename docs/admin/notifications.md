# 通知体系（notifications）

优先级：P1 · 前端状态：wip（邮件 / APP 推送配置页已挂）

## 通道

| 通道     | 说明                                   |
| -------- | -------------------------------------- |
| 邮件     | `/manage/admin/email`：SMTP + 开关 + **未读汇总调度**（时段 / 单聊·群聊分钟） |
| APP 推送 | `/manage/admin/app-push`；Mobile alias；设置可关 |
| 桌面通知 | Electron 本地通知（失焦新消息；设置可关） |
| 时段静音 | 移动端本地每日时段（无云端 API；静音内撤别名） |
| 站内     | IM / 未读；个人设置通知偏好            |

## 邮件未读汇总字段

| 字段 | 说明 |
| ---- | ---- |
| `messageUnreadTimeRanges` | `[["HH:mm","HH:mm"],…]`；空数组永不发 |
| `messageUnreadUserMinute` / `messageUnreadGroupMinute` | 满 N 分钟才汇入；`-1` 跳过该类型 |

## API

- `GET/POST system/setting/email` · `GET system/email/check`
- 契约：[infra/email.md](../../../blue-dock-java/docs/infra/email.md) · [modules/notify](../../../blue-dock-java/docs/modules/notify/)
