# 账号（user-account）

路由：`/login` · `/register` · `/forgot-password` · `/token` · `/single/valid/email` · 优先级：P0 · 前端状态：wip

## 登录

- 密码：**RSA-OAEP-SHA256** 密文 + `keyId`（先 `GET users/key/client`）；`code === -11` 清公钥缓存重试一次。
- 图形验证码：**是否出现由后端判定**（前端不做失败次数统计）：
  1. 进入页调 `GET users/login/needCode`；`need=true` 时展示并拉 `codeJson`。
  2. 登录失败 `code === -3`（`CAPTCHA_REQUIRED`）时展示并拉 `codeJson`。
  3. 其它登录失败后再调 `needCode`；若已展示则刷新验证码图。
  4. `need=false` 且未收到 `-3` 时可不填验证码。
- Token：登录成功写入 `accessToken` + `refreshToken`；`code === -2` 时单飞 `POST users/token/refresh` 后重试原请求；refresh 失败或 `code === 1001` 清会话跳登录。
- Token 桥：`/token?token=` → 校验 `users/info`。
- `code === 1001` 清会话跳登录。
- **扫码登录**：登录页「扫码」生成 `users/login/qrCode?type=create`；移动端「扫一扫」`type=confirm`；桌面轮询 `status` 取 token。
- **演示帐号**：若服务端配置 `bluedock.demo.account`/`password`，密码模式显示「填入演示帐号」（`GET system/demo`）；未配置则不展示。
- **年度报告**：设置 / 头像菜单 → `users/annual/report`（可选 `year`）。
- **分享选择器**：`users/share/list`（转发 / 合并转发 / 报告分享 / 网盘发到会话；可搜联系人开单聊）。
- **公开资料**：`GET users/basic`（指定 `userId`；已读回执 / @ 提及成员名等轻量展示，不含 isBot）。

## 注册（`/register`）

- 邮箱输入框旁 **发送验证码**；**邮箱验证码输入框常显**。
- 密码 / 确认密码；密码 RSA 加密后 `POST users/register`（`password` + `keyId` + `emailCode`）。
- `GET users/register/needInvite` 为 true 时显示邀请码。
- 契约：`GET users/email/code?type=reg`、`POST users/register`（java 已落地）。

## 忘记密码（`/forgot-password`）

- 邮箱 + 发送验证码；邮箱验证码输入框常显。
- 校验码后提交新密码（RSA + `keyId`）→ `POST users/password/reset`。
- 契约：`GET users/email/code?type=reset`、`POST users/password/reset`（java 已落地）。

## API

[modules/user-account](../../../blue-dock-java/docs/modules/user-account/) · [auth-wire](../../../blue-dock-java/docs/modules/user-account/auth-wire.md)
