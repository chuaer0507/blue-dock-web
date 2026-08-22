# 个人设置（user-settings）

路由：`/manage/setting/*` · 优先级：P0 · 前端状态：wip（设置页 + Manage 头像菜单已接）

## Section

| path          | 说明                                              | 前端 |
| ------------- | ------------------------------------------------- | ---- |
| personal      | 资料（`users/editData` + `imageUpload` / **`imageView` 选图**）+ **所属部门** + 语言 | 已接 |
| tags          | 个性标签（`users/tags/*`：列表/增删改/认可）      | 已接 |
| password      | 改密（RSA-OAEP `oldPassword`+`password`+`keyId`） | 已接 |
| email         | 邮箱展示 / 改邮（`email/edit`）/ 重发验证（`email/send`） | 已接 |
| appearance    | 主题仅本地 `blue-dock-theme`                      | 已接 |
| keyboard      | 快捷键一览（桌面 / 移动更相关）                   | 已接 |
| devices       | 登录设备列表 / 改名 / 踢下线                      | 已接 |
| annual        | 个人年度报告（`users/annual/report`，可选年份） | 已接 |
| version       | 版本与运行时 + `system/version` / `get/updateLog` / `get/chinaIp` / `get/info` + `users/token/expire` | 已接 |
| attendance    | 个人签到状态 / MAC / 人脸登记状态                 | 已接 |
| notifications | 本机推送别名开关；移动端时段静音（本地） | 已接 |
| license       | License（超管：在线 / 离线）                      | 已接 |
| danger        | 注销账号（warning → confirm）                     | 已接 |

侧栏页脚：公开页 [`/privacy`](../guide/routing.md)（iframe 加载匿名 `GET /api/privacy` HTML）。登录壳页脚同样链到 `/privacy`。

别名：`language`→personal · `theme`→appearance · `device`→devices · `delete`→danger。  
系统设置入口（管理员）→ `/manage/admin/*`。

## 头像菜单（Manage 壳）

侧栏底部 / Tabbar「我的」：最近任务、收藏、个人设置、系统设置 / License（admin）、清缓存、退出。无头像时回退 `GET /avatar` 字母图。Manage 壳挂载 `useRealtime`。

## API

[modules/user-settings](../../../blue-dock-java/docs/modules/user-settings/) · [user-account](../../../blue-dock-java/docs/modules/user-account/)
