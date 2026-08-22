# 签到打卡（attendance）

入口：应用中心 `/manage/attendance` · 设置 `/manage/setting/attendance` · 管理规则 `/manage/admin/attendance` · 匿名安装指引 `/attendance/install` · 优先级：P1 · 前端状态：wip（打卡含**手动/定位/刷脸** / 月历明细 / 高级规则 / MAC·人脸登记 / WiFi 安装指引）

## 命名

领域、路径、包名一律 **`attendance`**。禁止 `checkin` / `signin`。

## 能力

- 个人签到日历（点击日期看当日明细）、打卡：手动（`punch=1`）、**定位**（`latitude`/`longitude`）、**刷脸**（`faceCaptureObjectId`，经 `system/imageUpload`）。
- 管理员签到规则：班次、方式、提醒、补卡/人脸开关；Wi-Fi（`reportKey`/`installCmd`）、定位（地图 Key / 坐标 / 半径）。
- **WiFi 安装指引页**（匿名 `GET public/attendance/install`；管理端可打开深链）。
- 个人 MAC；人脸登记：`system/imageUpload` → `users/attendance/save?faceUploadObjectId=`（需插件 + `faceUpload=open`）。
- 与数据导出联动：管理规则页「导出签到数据」深链 `/manage/export`。

## React 要点

- `features/attendance/AttendancePage` · `AdminAttendancePage` · `AttendanceInstallPage`
- 个人资料仍在 `features/setting/AttendanceSettingPage`

## API

[modules/attendance](../../../blue-dock-java/docs/modules/attendance/)
