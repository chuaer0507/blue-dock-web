# API 约定（对接 blue-dock-java）

**接口单一事实来源（SSOT）**：[`blue-dock-java/docs`](../../../blue-dock-java/docs/README.md)。

前端不得另造路径、字段简写或响应信封。实现与联调一律以 Java 仓文档为准；本仓只写消费侧约定与模块索引。

## 必读契约

| 文档          | 路径                                                                                | 用途                                                           |
| ------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| API 总表      | [contract/api-contract.md](../../../blue-dock-java/docs/contract/api-contract.md)   | 全量 URL / HTTP / 说明                                         |
| 路由规则      | [contract/api-routing.md](../../../blue-dock-java/docs/contract/api-routing.md)     | `api/{resource}/{action}`、双下划线 sub-action                 |
| 命名铁律      | [contract/naming.md](../../../blue-dock-java/docs/contract/naming.md)               | camelCase 全词；禁止简写（`checkin`/`signin`→`attendance` 等） |
| 领域命名      | [contract/domain-naming.md](../../../blue-dock-java/docs/contract/domain-naming.md) | Project / Task / Dialog …                                      |
| i18n / 错误码 | [contract/i18n.md](../../../blue-dock-java/docs/contract/i18n.md)                   | `code` + message key                                           |
| 实时通道      | [architecture/realtime.md](../../../blue-dock-java/docs/architecture/realtime.md)   | `/ws` 帧类型                                                   |
| 分片上传      | [infra/upload.md](../../../blue-dock-java/docs/infra/upload.md)                     | init / chunk / merge                                           |

各业务细项见 `blue-dock-java/docs/modules/<feature>/api.md`（本仓对应模块文档已挂链接）。

## 路由形态

```
api/{resource}/{action}           → ResourceController.action()
api/{resource}/{action}/{sub}     → action__sub()   // 最多一层 __
```

- 一接口一路径，禁止前端自造别名。
- HTTP 动词以契约表为准（历史接口多为 GET 传参；新接口读 GET、写 POST）。
- 前缀归属：`users` / `project` / `dialog` / `file` / `upload` / `report` / `dashboard` / `system` / `license` / `assistant` / `search` / `apps` / `complaint` / `approve` / `public`。

## 响应信封

```json
{ "code": 0, "message": "", "data": {} }
```

| 约定       | 说明                                                            |
| ---------- | --------------------------------------------------------------- |
| 成功       | `code === 0`                                                    |
| 业务错误   | HTTP 200 + `code !== 0`；展示 `message`（已是当前语言）         |
| 未登录     | `code === 1001`（无 Bearer）                                    |
| Token 过期 | `code === -2` → 单飞 `users/token/refresh` 后重试；失败再跳登录 |
| 字段       | JSON **camelCase 全词**（`userId`、`messageId`、`macAddress`…） |

```ts
// packages/api — 示意（实际用 get / post / put / del）
import { get, post } from './http-api';

const data = await get<ProjectView[]>('project/lists');
await post('project/add', { name: 'x' });
```

## 鉴权

- 默认：`Authorization: Bearer <token>`
- 匿名白名单见 [api-routing.md](../../../blue-dock-java/docs/contract/api-routing.md)（login、key/client、register/needInvite、email/verification、system/version、project/invite/info、`/api/public/**` 等）
- 登录/改密：先 `GET api/users/key/client`，RSA-OAEP 加密密码；细则 [user-account/auth-wire.md](../../../blue-dock-java/docs/modules/user-account/auth-wire.md)

## WebSocket

- 路径：`/ws`；握手 `?token=` 或 Bearer
- 心跳：`ping` → `pong`
- 下行帧：`dialog.message` / `task.*` / `column.*` / `project.sort` / `appBadge` / `presence.*` / `operation` 等，见 realtime 文档
- 收到后：`invalidateQueries` 或补丁更新；桌面端可再 `desktop.notify`

## 上传

走 `api/upload/*` 分片协议（infra/upload），对象 ID 再挂到任务/文件/人脸等业务接口；勿自造上传路径。

## 模块 → 后端文档索引

| 本仓模块                                                              | Java feature / 前缀                      | API 文档                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [dashboard](../navigation/dashboard.md)                               | `dashboard`                              | [modules/dashboard/api.md](../../../blue-dock-java/docs/modules/dashboard/api.md)                                                                                                                                                                 |
| [calendar](../navigation/calendar.md)                                 | 任务时间窗                               | [modules/calendar/api.md](../../../blue-dock-java/docs/modules/calendar/api.md)                                                                                                                                                                   |
| [messenger](../navigation/messenger.md)                               | `dialog`                                 | [modules/messenger/api.md](../../../blue-dock-java/docs/modules/messenger/api.md)                                                                                                                                                                 |
| [file](../navigation/file.md)                                         | `file`                                   | [modules/file/api.md](../../../blue-dock-java/docs/modules/file/api.md)                                                                                                                                                                           |
| [project](../collaboration/project.md)                                | `project`                                | [modules/project/api.md](../../../blue-dock-java/docs/modules/project/api.md)                                                                                                                                                                     |
| [task](../collaboration/task.md)                                      | `project/task`                           | [modules/task/api.md](../../../blue-dock-java/docs/modules/task/api.md)                                                                                                                                                                           |
| [meeting](../collaboration/meeting.md)                                | `users/meeting`                          | [modules/meeting/api.md](../../../blue-dock-java/docs/modules/meeting/api.md)                                                                                                                                                                     |
| [report](../collaboration/report.md)                                  | `report`                                 | [modules/report/api.md](../../../blue-dock-java/docs/modules/report/api.md)                                                                                                                                                                       |
| [attendance](../collaboration/attendance.md)                          | `users/attendance` · `system/attendance` | [modules/attendance/api.md](../../../blue-dock-java/docs/modules/attendance/api.md)                                                                                                                                                               |
| [application](../navigation/application.md) / [apps](../apps/apps.md) | `users/appSort` · `apps`                 | [modules/application/overview.md](../../../blue-dock-java/docs/modules/application/overview.md) · [modules/apps/overview.md](../../../blue-dock-java/docs/modules/apps/overview.md)                                                               |
| [micro-app](../apps/micro-app.md)                                     | `apps`                                   | [modules/micro-app/api.md](../../../blue-dock-java/docs/modules/micro-app/api.md)                                                                                                                                                                 |
| [appstore](../apps/appstore.md)                                       | appstore                                 | [modules/appstore/api.md](../../../blue-dock-java/docs/modules/appstore/api.md)                                                                                                                                                                   |
| [bot](../apps/bot.md)                                                 | `users/userBot`                          | [modules/bot/api.md](../../../blue-dock-java/docs/modules/bot/api.md)                                                                                                                                                                             |
| [ai-assistant](../apps/ai-assistant.md)                               | `assistant`（feature id）                | [modules/assistant/api.md](../../../blue-dock-java/docs/modules/assistant/api.md) · [infra/ai-assistant.md](../../../blue-dock-java/docs/infra/ai-assistant.md)                                                                                   |
| [user-account](../org/user-account.md)                                | `users`                                  | [modules/user-account/api.md](../../../blue-dock-java/docs/modules/user-account/api.md)                                                                                                                                                           |
| [user-settings](../org/user-settings.md)                              | `users` / system 个人项                  | [modules/user-settings/api.md](../../../blue-dock-java/docs/modules/user-settings/api.md)                                                                                                                                                         |
| [org-department](../org/org-department.md)                            | `users/department`                       | [modules/org-department/api.md](../../../blue-dock-java/docs/modules/org-department/api.md)                                                                                                                                                       |
| [role-permission](../org/role-permission.md)                          | project permission 等                    | [modules/role-permission/api.md](../../../blue-dock-java/docs/modules/role-permission/api.md)                                                                                                                                                     |
| [favorite](../org/favorite.md)                                        | `users/favorite*`                        | [modules/favorite/api.md](../../../blue-dock-java/docs/modules/favorite/api.md)                                                                                                                                                                   |
| [system-setting](../admin/system-setting.md)                          | `system`                                 | [modules/system-setting/api.md](../../../blue-dock-java/docs/modules/system-setting/api.md)                                                                                                                                                       |
| [notifications](../admin/notifications.md)                            | `notify` 等                              | [modules/notify/api.md](../../../blue-dock-java/docs/modules/notify/api.md) · [infra/app-push.md](../../../blue-dock-java/docs/infra/app-push.md) · [infra/email.md](../../../blue-dock-java/docs/infra/email.md)                                 |
| [data-export](../admin/data-export.md)                                | export / attendance / approve            | [modules/data-export/overview.md](../../../blue-dock-java/docs/modules/data-export/overview.md)                                                                                                                                                   |
| [admin-extras](../admin/admin-extras.md)                              | ldap / license / complaint               | [modules/ldap/api.md](../../../blue-dock-java/docs/modules/ldap/api.md) · [modules/license/api.md](../../../blue-dock-java/docs/modules/license/api.md) · [modules/abuse-report/api.md](../../../blue-dock-java/docs/modules/abuse-report/api.md) |
| [search](../navigation/search.md)                                     | `search`                                 | [modules/search/api.md](../../../blue-dock-java/docs/modules/search/api.md)                                                                                                                                                                       |
| [upload](../guide/upload.md)                                          | `upload`                                 | [modules/upload/overview.md](../../../blue-dock-java/docs/modules/upload/overview.md) · [infra/upload.md](../../../blue-dock-java/docs/infra/upload.md)                                                                                           |

## 前端硬约束

1. 新增/变更接口：先改 **blue-dock-java** 契约与 `modules/*/api.md`，再改本仓消费代码。
2. 禁止使用旧信封 `ret` / `msg`；统一 `code` / `message` / `data`。
3. 禁止简写字段；对照 [naming.md](../../../blue-dock-java/docs/contract/naming.md)。
4. OpenAPI / 手写 types 以契约表字段为准，放在 `packages/api`。
