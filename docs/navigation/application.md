# 应用中心（application）

路由：`/manage/application` · 优先级：P0 · 前端状态：wip（卡片网格 / HTML5 拖拽排序 / 微应用宿主 / 审批入口）

## 结构

- **常用**：系统应用卡片 + `location=application` 的微应用。
- **管理员**：内置管理入口 + `location=application/admin`（兼容 `admin`）的微应用；仅管理员可见。
- 侧栏可注入 `location=main/menu` 的微应用一级入口。
- 支持拖拽排序（仅本人可见；tabbar 下禁用拖拽）；恢复默认排序（`users/appSort/save`）。
- 管理员可配置自定义微应用菜单位置（应用市场「自定义菜单」）。
- **审批中心**：若已安装 `approve` 微应用则打开宿主页，否则 danger toast 提示安装。
- **创建群组 / 创建项目 / 添加任务**：分别派发 `blue-dock:new-group` / `blue-dock:new-project` / 打开快建弹层（布局层挂载隐藏 Modal）。

## 常用系统应用（产品）

| value        | 名称       | 行为概要                                 |
| ------------ | ---------- | ---------------------------------------- |
| approve      | 审批中心   | 有微应用则打开；否则 danger 提示安装     |
| attendance   | 签到打卡   | → `/manage/setting/attendance`           |
| report       | 工作报告   | → `/manage/report`                       |
| favorite     | 我的收藏   | → `/manage/favorite`                     |
| recent       | 最近打开   | → `/manage/recent`                       |
| mybot        | 我的机器人 | → `/manage/bot`                          |
| createGroup  | 创建群组   | 打开建群弹层（`blue-dock:new-group`）    |
| meeting      | 在线会议   | → `/meeting`                             |
| addProject   | 创建项目   | 打开建项弹层（`blue-dock:new-project`）  |
| addTask      | 添加任务   | 快建任务 Modal → `/single/task/:id`      |
| exportManage | 导出管理   | → `/manage/export`                       |
| calendar     | 日历       | → `/manage/calendar`（tabbar）           |
| file         | 文件       | → `/manage/file`（tabbar）               |
| setting      | 设置       | → `/manage/setting`（tabbar）            |
| scan         | 扫一扫     | 仅移动壳 · `/manage/scan` 确认登录二维码 |

> 领域命名用 `attendance`；禁止路径/包名 `checkin` / `signin`。

## 管理员应用

| value         | 名称     |
| ------------- | -------- |
| ldap          | LDAP     |
| mail          | 邮件通知 |
| appPush       | APP 推送 |
| complaint     | 举报管理 |
| dataExport    | 数据导出 |
| allUser       | 团队管理 |
| appstore      | 应用市场 |
| systemSetting | 系统设置 |

## React 要点

- `features/application`：`ApplicationPage` 卡片网格；`MicroAppHostPage` iframe / 外开；排序 Query `useAppSort` / 角标 `useAppBadges`。

## API

[modules/application](../../../blue-dock-java/docs/modules/application/) · [apps](../../../blue-dock-java/docs/modules/apps/) · [micro-app](../../../blue-dock-java/docs/modules/micro-app/)
