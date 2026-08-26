# 全量功能验收清单

状态：`pending`（未做）→ `shell`（路由占位）→ `wip`（业务开发中）→ `done`。

产品变更先改规格，再改代码。关闭里程碑前相关行须到 `done`，并补测。

## navigation

| ID          | 名称     | 规格                                           | 状态                                                                                                                                                                       |
| ----------- | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dashboard   | 仪表盘   | [dashboard.md](../navigation/dashboard.md)     | done（个人待开始/本周完成/团队/优先级/成员筛选含 user/projects/高优下钻/TaskModal；团队视图受 `departmentOwnerProjectView` 门控；已完成单元、真实后端 E2E 与三端构建验证） |
| file        | 文件     | [file.md](../navigation/file.md)               | done（目录/搜索/上传/移动复制/共享/发送到会话/预览含 PDF/文本编辑保存/上传替换/Office/内容历史/收藏/回收站/下载打包权限门控；消息附件 single 预览下载回会话；已完成真实后端 E2E：新建目录与字符串 ID 路由打开）       |
| messenger   | 即时通讯 | [messenger.md](../navigation/messenger.md)     | done（契约主路径已齐；OKR + 微应用桥；`?msg=`；dialogAction；免打扰本地；公告/模板 silence；独立窗附件/已读/翻页；AI 多会话按 `session_key` 隔离；已完成真实后端 E2E）      |
| calendar    | 日历     | [calendar.md](../navigation/calendar.md)       | done（月/周/日 + 全天/时段块 + 拖拽改期含 TASK_TIME 门控与 easyLists 冲突确认 + 快建含 TASK_ADD + 项目筛选 + TaskModal；已完成真实后端 E2E：当天任务展示、详情入口、月周日切换）                                                    |
| application | 应用中心 | [application.md](../navigation/application.md) | done（卡片/拖拽排序/location 分区/微应用宿主；createGroup/addProject/addTask 弹层；审批无微应用明确提示；已完成真实后端 E2E：内置卡片、快速建任务与工作报告路由）           |
| search      | 全局搜索 | [search.md](../navigation/search.md)           | done（防抖聚合 / `?q=` 深链 / 消息经 message/one 跳转含 `?msg=` 定位 / 管理员按类型重建；已完成真实后端 E2E：项目结果与字符串 ID 跳转）                                      |

## collaboration

| ID         | 名称     | 规格                                            | 状态                                                                                                                                                                                                                                                                                                                                               |
| ---------- | -------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| project    | 项目     | [project.md](../collaboration/project.md)       | done（设置/置顶/侧栏拖拽排序/看板拖拽含 TASK_MOVE+LIST_SORT 门控/列管理细粒度 TASK_LIST_*/column/one hook/成员含邀请链接/权限含 TASK_ADD·STATUS·ARCHIVED 批量与工作流拖/收藏/搜索筛选/归档列表/动态/CSV导出/工作流配置/项目标签；部门只读·归档禁编；已完成真实后端 E2E 与三端构建验证）                                                            |
| task       | 任务     | [task.md](../collaboration/task.md)             | done（详情含权限门控 UPDATE/TIME/STATUS/REMOVE/ARCHIVED/MOVE/ADD/Modal/快建 CreateTaskQuick 含 TASK_ADD/优先级颜色可见性勾选/负责人协助/关联搜索/子任务升级/跨项目移动/软删/附件下载删/模板默认删除排序跨项目搜/看板头像/DatePicker/收藏/讨论/流转/标签/子任务/动态含 resetFromLog/快建含模板/复制/发送到会话/循环/内容历史/AI/计划冲突 easyLists；已完成超大 ID 真实后端 E2E：详情、完成、重开、子任务） |
| view       | 视图     | [view.md](../collaboration/view.md)             | done（看板/列表/甘特/工作流含标签与负责人 + 列标题拖拽排序 + 配置编辑 + 搜索筛选 + 批量完成/归档/换列 + 每项目偏好；已完成真实后端 E2E：列表、甘特与工作流切换）                                                                                                                                       |
| meeting    | 会议     | [meeting.md](../collaboration/meeting.md)       | done（大厅 + Agora RTC + 会话发起 + tourist 昵称 + 搜索选人邀请 + 卡片 endAt 已结束；已完成大厅真实 E2E 与会议服务/关房测试）                                                                                                                                                                      |
| report     | 工作报告 | [report.md](../collaboration/report.md)         | done（列表/撰写选人含周期 offset/详情含AI解读/分享短码/分享到会话经 share/list/统计分析/收到列表批量已读；已完成真实后端 E2E：创建与字符串 ID 详情路由）                                                                                                                                          |
| attendance | 签到     | [attendance.md](../collaboration/attendance.md) | done（打卡含手动/定位/刷脸/月历明细/高级规则/MAC·人脸登记/WiFi 安装指引页；已完成月历/规则/匿名安装指引 E2E 与打卡/提醒服务测试）                                                                                                                                                              |

## apps

| ID           | 名称     | 规格                                       | 状态                                                                                                                  |
| ------------ | -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| app-system   | 系统应用 | [apps.md](../apps/apps.md)                 | done（内置卡片、个人排序、快建任务与系统路由；已完成真实后端 E2E）                                                    |
| app-admin    | 管理应用 | [apps.md](../apps/apps.md)                 | wip（应用中心管理员卡片）                                                                                             |
| micro-app    | 微应用   | [micro-app.md](../apps/micro-app.md)       | wip（iframe + 桥含 notifyMessageStream + location 分区/主导航 + keepAlive；菜单可配 type/keepAlive/badgeClearOnOpen） |
| bot          | 机器人   | [bot.md](../apps/bot.md)                   | done（CRUD、头像上传/图片空间、复制 ID、删除审计与开始聊天；已完成前端 ID 映射单测与后端服务测试）                   |
| appstore     | 应用市场 | [appstore.md](../apps/appstore.md)         | done（安装/更新/卸载、自定义菜单与应用中心联动；后端服务测试覆盖目录、联动和 appstore 禁卸约束）                     |
| ai-assistant | AI 助手  | [ai-assistant.md](../apps/ai-assistant.md) | done（FAB、流式、会话、反馈、配图、元素匹配与 WS 操作派发；已完成前端与后端服务测试）                                  |
| upload       | 分片上传 | [upload.md](./upload.md)                   | done（文件/任务入口、本机续传、取消与图片空间；已完成前端上传单测和后端上传服务测试）                                  |

## org

| ID              | 名称       | 规格                                            | 状态                                                                                                               |
| --------------- | ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| user-account    | 账号       | [user-account.md](../org/user-account.md)       | done（登录/扫码/注册/重置/邮箱验证、无感 refresh、年度报告、分享选择器与公开资料；已完成认证和用户服务测试）        |
| user-settings   | 个人设置   | [user-settings.md](../org/user-settings.md)     | done（设置页、头像菜单、年度报告、标签、隐私、邮箱、资料、版本与通知；已完成前端检查和用户服务测试）                  |
| org-department  | 部门       | [org-department.md](../org/org-department.md)   | done（树、用户、导入、副负责人及离职交接选择器；已完成部门与用户管理服务测试）                                    |
| role-permission | 角色权限   | [role-permission.md](../org/role-permission.md) | done（权限矩阵、成员管理及页面操作门控；已完成前端矩阵单测与后端权限服务测试）                                      |
| favorite        | 收藏与最近 | [favorite.md](../org/favorite.md)               | done（列表、备注、星标、消息/文件路由与浏览记录；已完成收藏/浏览及附件最近记录服务测试）                           |

## admin

| ID                 | 名称     | 规格                                            | 状态                                                                                  |
| ------------------ | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| system-setting     | 系统设置 | [system-setting.md](../admin/system-setting.md) | done（通用/优先级/列模板、AI Bot 模型同步及文件打包白名单选人；已完成系统设置服务测试） |
| meeting-setting    | 会议设置 | 同上 / java `setting/meeting`                   | done（会议参数管理页与密钥脱敏/掩码保留；已完成会议设置服务测试）                    |
| attendance-setting | 签到规则 | java `setting/attendance`                       | done（规则管理页、敏感字段保护与导出深链；已完成规则/导出服务测试）                   |
| email-notice       | 邮件通知 | [notifications.md](../admin/notifications.md)   | done（SMTP、测试发信与未读汇总调度；已完成邮件设置和未读通知服务测试）               |
| app-push           | APP 推送 | [notifications.md](../admin/notifications.md)   | done（管理员配置、移动别名同步、消息投递与延迟队列；已完成推送相关服务测试）         |
| data-export        | 数据导出 | [data-export.md](../admin/data-export.md)       | done（任务/签到/审批异步导出、24h 本人下载链接与消息内 Bearer 鉴权；已完成前端解析及后端服务测试） |
| ldap / license 等  | 扩展     | [admin-extras.md](../admin/admin-extras.md)     | done（LDAP、授权、举报含附图、个人群检索与上传库；已完成前端检查和后端服务测试） |

## clients

| ID              | 名称     | 规格                                  | 状态                                                                                                |
| --------------- | -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| web-client      | Web      | [clients.md](../clients/clients.md)   | done（壳挂 `@blue-dock/app`；已完成生产构建和 6 项无需账号的冒烟 E2E）                              |
| electron-client | Electron | [electron.md](../clients/electron.md) | done（托盘/通知/Dock 角标/多窗/`/preload`；已完成构建、类型检查和 Lint，渲染进程未直引 Electron）   |
| mobile-client   | Mobile   | [mobile.md](../clients/mobile.md)     | done（角标/推送 alias/本地时段静音/扫码确认登录；已完成构建、类型检查、Lint 和 8 项壳/桥接单测）    |
| shortcut        | 快捷键   | [shortcut.md](../clients/shortcut.md) | done（K / ⇧P / ⇧M / 消息 ⇧U / 任务 E+Esc；随共享应用三端构建验证）                                  |

## 工程基建

| 项                                      | 状态                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Bun workspaces monorepo                 | done                                                                                                                      |
| apps/web · desktop · mobile 壳          | done                                                                                                                      |
| packages/api http-api + WS              | done                                                                                                                      |
| packages/app 框架（主题 / 路由 / 登录） | done                                                                                                                      |
| config-tailwind（HeroUI styles）        | done                                                                                                                      |
| i18n `zh-CN` / `en-US`                  | done                                                                                                                      |
| Playwright E2E                          | wip（冒烟含扫码、未登录 redirect、`/pro`、`/preload`、`/privacy`；`auth.spec` 登录后主导航需 `E2E_EMAIL`/`E2E_PASSWORD`） |
