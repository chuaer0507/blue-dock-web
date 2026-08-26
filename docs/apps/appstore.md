# 应用市场（appstore）

路由建议：`/manage/admin/appstore` · 优先级：P0 · 前端状态：done

## 能力

- 浏览官方目录 / 安装 / **更新** / 卸载微应用（管理员）。
- `appstore` 自身为系统应用，前端禁用卸载。
- 自定义 `microAppMenu` 入口：保存契约 location `application` / `application/admin` / `main/menu`（读入时兼容旧值 `admin` / `main`）；可编辑 `type`（iframe / iframe_blank / external）、`keepAlive`、`badgeClearOnOpen`。
- 与应用中心菜单、角标、主导航联动。

## API

| 能力       | 方法     | 路径                       |
| ---------- | -------- | -------------------------- |
| 目录       | GET      | `system/apps/catalog`      |
| 已安装     | GET      | `system/apps/installed`    |
| 安装       | POST     | `system/apps/install`      |
| 更新       | POST     | `system/apps/update`       |
| 卸载       | POST     | `system/apps/uninstall`    |
| 微应用菜单 | POST      | `system/microAppMenu`      |

契约：[modules/appstore](../../../blue-dock-java/docs/modules/appstore/)
