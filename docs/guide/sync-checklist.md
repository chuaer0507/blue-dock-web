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
| meeting    | 会议     | [meeting.md](../collaboration/meeting.md)       | wip（大厅 + Agora RTC + 会话发起 + tourist 昵称 + 搜索选人邀请 + 卡片 endAt 已结束）                                                                                                                                                                                                                                                               |
| report     | 工作报告 | [report.md](../collaboration/report.md)         | wip（列表/撰写选人含周期 offset/详情含AI解读/分享短码/分享到会话经 share/list/统计分析/收到列表批量已读）                                                                                                                                                                                                                                          |
| attendance | 签到     | [attendance.md](../collaboration/attendance.md) | wip（打卡含手动/定位/刷脸/月历明细/高级规则/MAC·人脸登记/WiFi 安装指引页）                                                                                                                                                                                                                                                                         |

## apps

| ID           | 名称     | 规格                                       | 状态                                                                                                                  |
| ------------ | -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| app-system   | 系统应用 | [apps.md](../apps/apps.md)                 | wip（应用中心内置卡片）                                                                                               |
| app-admin    | 管理应用 | [apps.md](../apps/apps.md)                 | wip（应用中心管理员卡片）                                                                                             |
| micro-app    | 微应用   | [micro-app.md](../apps/micro-app.md)       | wip（iframe + 桥含 notifyMessageStream + location 分区/主导航 + keepAlive；菜单可配 type/keepAlive/badgeClearOnOpen） |
| bot          | 机器人   | [bot.md](../apps/bot.md)                   | wip（CRUD + 头像上传/图片空间 + 复制 ID + 删除审计 + 开始聊天）                                                       |
| appstore     | 应用市场 | [appstore.md](../apps/appstore.md)         | wip（安装/更新/卸载 + 契约 location 菜单；type/keepAlive/badgeClearOnOpen；禁卸 appstore）                            |
| ai-assistant | AI 助手  | [ai-assistant.md](../apps/ai-assistant.md) | wip（FAB/流式/历史删清/反馈赞踩/会话配图 newImages/页面匹配 matchElements/log/search/WS operation/Admin 可见模型）    |
| upload       | 分片上传 | [upload.md](./upload.md)                   | wip（api + 文件/任务入口 + 本机续传 + 取消 + imageView/fileUpload）                                                   |

## org

| ID              | 名称       | 规格                                            | 状态                                                                                                               |
| --------------- | ---------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| user-account    | 账号       | [user-account.md](../org/user-account.md)       | wip（登录含扫码 / 演示帐号 / 注册 / 重置 / 邮箱验证 / 无感 refresh / 年度报告 / 分享选择器 / `users/basic`）       |
| user-settings   | 个人设置   | [user-settings.md](../org/user-settings.md)     | wip（设置页 + 头像菜单 + 年度报告 + 个性标签 + 隐私政策 + 改邮箱 + 个人资料 + 版本/更新日志 + 通知含移动时段静音） |
| org-department  | 部门       | [org-department.md](../org/org-department.md)   | wip（树/用户/导入/副负责人；离职交接选人 Modal）                                                                   |
| role-permission | 角色权限   | [role-permission.md](../org/role-permission.md) | wip（权限矩阵 / 成员管理）                                                                                         |
| favorite        | 收藏与最近 | [favorite.md](../org/favorite.md)               | wip（列表名补洞/备注/星标；message/dialog → Manage IM；message_file 独立预览；browseSave + fileDetail）            |

## admin

| ID                 | 名称     | 规格                                            | 状态                                                                                  |
| ------------------ | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| system-setting     | 系统设置 | [system-setting.md](../admin/system-setting.md) | wip（含 AI Bot 已配模型 aiBotModels 同步；文件打包白名单选人）                        |
| meeting-setting    | 会议设置 | 同上 / java `setting/meeting`                   | wip                                                                                   |
| attendance-setting | 签到规则 | java `setting/attendance`                       | wip（规则页 + 导出深链）                                                              |
| email-notice       | 邮件通知 | [notifications.md](../admin/notifications.md)   | wip（SMTP + 测试发信 + 未读汇总调度）                                                 |
| app-push           | APP 推送 | [notifications.md](../admin/notifications.md)   | wip                                                                                   |
| data-export        | 数据导出 | [data-export.md](../admin/data-export.md)       | wip（触发导出 + 消息内鉴权下载）                                                      |
| ldap / license 等  | 扩展     | [admin-extras.md](../admin/admin-extras.md)     | wip（ldap / complaint 含举报附图提交与管理端展示 / user-groups searchUser / uploads） |

## clients

| ID              | 名称     | 规格                                  | 状态                                                                                                |
| --------------- | -------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| web-client      | Web      | [clients.md](../clients/clients.md)   | wip（壳挂 `@blue-dock/app`）                                                                        |
| electron-client | Electron | [electron.md](../clients/electron.md) | wip（托盘 / 通知含 `?msg=`+silence+免打扰跳过 / Dock 角标 / 多窗含独立窗附件已读翻页 / `/preload`） |
| mobile-client   | Mobile   | [mobile.md](../clients/mobile.md)     | wip（角标 / 推送 alias / 时段静音本地 / 扫一扫确认登录）                                            |
| shortcut        | 快捷键   | [shortcut.md](../clients/shortcut.md) | wip（K / ⇧P / ⇧M / 消息 ⇧U / 任务 E+Esc）                                                           |

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
