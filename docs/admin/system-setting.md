# 系统设置（system-setting）

路由：`/manage/admin/system`（及同级 admin 子页）· 优先级：P1 · 前端状态：wip

## 通用 Tab（`/manage/admin/system`）

| tab            | 内容         |
| -------------- | ------------ |
| setting        | 系统通用配置 |
| taskPriority   | 任务优先级   |
| columnTemplate | 项目列模板   |

文件与 OSS 落在 `/manage/admin/storage`（文件设置含打包权限；指定用户时用联系人选人写入 `packUserIds`）。

## 同级管理页（已挂路由）

| path       | 职责       |
| ---------- | ---------- |
| email      | 邮件通知   |
| meeting    | 会议       |
| ai-bot     | AI Bot     |
| attendance | 签到规则   |
| app-push   | APP 推送   |
| ldap       | LDAP       |
| appstore   | 应用市场   |
| storage    | 文件与 OSS |

LDAP 配置契约路径为 `system/setting/thirdAccess`，前端入口为 `/manage/admin/ldap`（见 [admin-extras.md](./admin-extras.md)）。

## API

[modules/system-setting](../../../blue-dock-java/docs/modules/system-setting/)
