# 系统应用 / 管理员应用（apps）

规格入口：[application.md](../navigation/application.md) · 前端状态：wip（应用中心卡片入口）

## 系统应用

应用中心「常用」内置卡片（收藏、最近、报告、机器人、签到、会议、建群、接龙、投票、建项目、加任务、日历、文件、设置等）。移动壳可含扫一扫。

## 管理员应用

LDAP、邮件通知、APP 推送、举报、数据导出、团队管理等；仅 `userIsAdmin`。

## 实现

卡片配置与角标、排序持久化走后端应用菜单接口；点击路由到对应 feature。

## API

[modules/apps](../../../blue-dock-java/docs/modules/apps/) · [application](../../../blue-dock-java/docs/modules/application/)
