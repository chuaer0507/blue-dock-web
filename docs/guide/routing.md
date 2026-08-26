# 路由表（React Router）

定义于 `packages/app`（数据路由 + `lazy`）。清单见 [`packages/app/README.md`](../../packages/app/README.md)。

实现列：`auth` 鉴权真页 · `wip` 业务开发中 · `shell` 路由+占位 · `done` 验收关闭。与 [sync-checklist.md](./sync-checklist.md) 同口径。

## 公开 / 特殊页

| name            | path                              | 职责                        | 实现 |
| --------------- | --------------------------------- | --------------------------- | ---- |
| index           | `/`                               | 有 token→manage，否则→login | auth |
| meeting         | `/meeting/:meetingId?/:sharekey?` | 会议室（含访客 sharekey）   | done |
| login           | `/login`                          | 登录 / 注册入口             | auth |
| register        | `/register`                       | 自助注册                    | auth |
| forgot-password | `/forgot-password`                | 忘记密码重置                | auth |
| token           | `/token`                          | Token 登录桥                | auth |
| pro             | `/pro`                            | Pro / 商业化介绍            | done |
| preload         | `/preload`                        | Electron / 客户端预加载壳   | done |
| privacy         | `/privacy`                        | 隐私政策（`/api/privacy`）  | done |
| 404             | `*`                               | 未匹配                      | done |

## Manage 主壳 `/manage`

需登录（`RequireAuth`）。布局：桌面侧栏 / 窄屏 Tabbar（`useScreen`）。

| name                  | path                             | 模块               | 实现 |
| --------------------- | -------------------------------- | ------------------ | ---- |
| manage-dashboard      | `dashboard`                      | 仪表盘             | done |
| manage-calendar       | `calendar`                       | 日历               | done |
| manage-messenger      | `messenger/:dialogAction?`       | IM                 | done |
| manage-project        | `project` / `project/:projectId` | 项目列表/详情      | done |
| manage-project-invite | `project/invite/:inviteId?`      | 项目邀请落地       | done |
| manage-file           | `file/:folderId?/:fileId?`       | 文件               | done |
| manage-application    | `application`                    | 应用中心           | done |
| manage-apps           | `apps/:appId`                    | 微应用宿主         | done |
| manage-bot            | `bot`                            | 机器人管理         | done |
| manage-report         | `report`                         | 工作报告           | done |
| manage-attendance     | `attendance`                     | 签到打卡           | done |
| manage-search         | `search`                         | 全局搜索           | done |
| manage-favorite       | `favorite`                       | 收藏               | done |
| manage-recent         | `recent`                         | 最近打开           | done |
| manage-department     | `department`                     | 部门 / 团队        | done |
| manage-export         | `export`                         | 数据导出           | done |
| manage-admin-*        | `admin/*`                        | 管理设置（见下表） | done |

### 设置 `/manage/setting`

| name                         | path            | 说明                           | 实现 |
| ---------------------------- | --------------- | ------------------------------ | ---- |
| manage-setting-personal      | `personal`      | 个人资料（含语言）             | done |
| manage-setting-tags          | `tags`          | 个性标签（增删改 / 认可）      | done |
| manage-setting-password      | `password`      | 改密                           | done |
| manage-setting-devices       | `devices`       | 登录设备                       | done |
| manage-setting-appearance    | `appearance`    | 主题（本地 `blue-dock-theme`） | done |
| manage-setting-notifications | `notifications` | 通知偏好                       | done |
| manage-setting-keyboard      | `keyboard`      | 快捷键一览                     | done |
| manage-setting-email         | `email`         | 邮箱 / 改邮 / 重发验证         | done |
| manage-setting-version       | `version`       | 版本 / 服务端 / 更新日志       | done |
| manage-setting-attendance    | `attendance`    | 个人签到相关                   | done |
| manage-setting-license       | `license`       | License（超管）                | done |
| manage-setting-danger        | `danger`        | 注销账号等危险操作             | done |

别名重定向：`language`→`personal` · `theme`→`appearance` · `device`→`devices` · `delete`→`danger` · `system`→`/manage/admin/system`。

### 管理后台 `/manage/admin/*`（done）

| path         | 职责                   | 状态 |
| ------------ | ---------------------- | ---- |
| `system`     | 通用 / 优先级 / 列模板 | done |
| `storage`    | 文件与 OSS             | done |
| `email`      | 邮件通知               | done |
| `meeting`    | 会议设置               | done |
| `ai-bot`     | AI Bot                 | done |
| `attendance` | 签到规则               | done |
| `app-push`   | APP 推送               | done |
| `ldap`       | LDAP                   | done |
| `appstore`   | 应用市场（管理）       | done |
| `complaint`  | 举报                   | done |
| `uploads`    | 上传库                 | done |

## Single 独立页

| name                 | path                                    | 用途             | 实现 |
| -------------------- | --------------------------------------- | ---------------- | ---- |
| single-apps          | `/single/apps/:name`                    | 微应用独立打开   | done |
| single-file-msg      | `/single/file/msg/:msgId`               | 消息内文件引导   | done |
| single-file-task     | `/single/file/task/:fileId`             | 任务附件         | done |
| single-file          | `/single/file/:codeOrFileId`            | 文件分享 / 预览  | done |
| single-task-content  | `/single/task/content/:taskId`          | 任务正文         | done |
| single-task          | `/single/task/:taskId`                  | 任务详情窗       | done |
| single-dialog        | `/single/dialog/:dialogId`              | 对话独立窗       | done |
| single-valid-email   | `/single/valid/email`                   | 邮箱验证（匿名） | done |
| single-report-edit   | `/single/report/edit/:reportEditId`     | 报告编辑         | done |
| single-report-detail | `/single/report/detail/:reportDetailId` | 报告详情         | done |

## 约定

- 未登录访问 `/manage/**` → `/login?redirect=`。
- Electron 子窗可带 `?window=popout` 隐藏主导航。
- `dialogAction` 深链打开指定会话 / 创建动作（`createGroup` → 建群弹层；`addProject` → 建项弹层）。
- `/token?token=` → 写 Bearer → 校验 `users/info` → `redirect`。
- 领域命名：签到一律 `attendance`（禁止 `checkin` / `signin` 作路径或包名）。
- 语言：`zh-CN` / `en-US`；主题：本地 `light` | `dark` | `system`。
