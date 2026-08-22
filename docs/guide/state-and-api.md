# 状态管理与 API

接口契约见 **[api.md](./api.md)**（SSOT：blue-dock-java）。本节只写前端状态与调用习惯。

## 调用层（`packages/api`）

axios 单例 + 拦截器注入鉴权与公共头；对外统一 `http-api`（信封解包不在拦截器里）。

| 文件                                 | 职责                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `src/client.ts`                      | axios 实例；公共头（含 `X-Device-ID` / `X-Timezone`）；Loading / Cache / lifecycle           |
| `src/request-meta.ts`                | 设备 ID / 时区（公共请求头）                                                                 |
| `src/http-api.ts`                    | `get` / `post` / `put` / `del` / `upload` / `getList` / `getPageList`；解包信封；MessageTips |
| `src/common/`                        | `PageMeta` / `PagerModel` / `ResultModel` / `ExtraModel` / `AppException`                    |
| `src/errors/api-code.ts`             | 业务码（`code` + `i18nKey`，对齐 java `ErrorCodes`）                                         |
| `src/errors/transport-error-code.ts` | 传输层错误（超时 / 断网 / HTTP / 解析等）                                                    |
| `src/errors/api-error.ts`            | `ApiError` / `TransportError`                                                                |
| `src/errors/http-fail-message.ts`    | `E{status} - …` 文案                                                                         |
| `src/errors/message-tips.ts`         | MessageTips：由 `ExtraModel` 控制是否提示；信封 `tipsType` 控制样式                          |
| `src/auth/session.ts`                | `accessToken` / `refreshToken` 读写；`1001` / refresh 失败清会话 + 可注入跳转                |
| `src/auth/refresh.ts`                | `users/token/refresh`；单飞 `ensureRefreshedAccessToken`                                     |
| `src/auth/password-cipher.ts`        | RSA-OAEP-SHA256；字段 **`keyId`**（禁止 `kid` / 明文回退）                                   |
| `src/auth/login.ts`                  | `users/key/client` → 加密 → `users/login`；`-11` 清公钥重试                                  |

约定：

- 统一经 `http-api`：`get` / `post` / `put` / `del` / `upload`（multipart）；分页用 `getPageList`；普通数组可用 `getList`；成功条件 `code === 0`。
- 小图 / 直传：`upload('system/imageUpload', file)`；大文件仍走分片 `upload/*`（见 [upload.md](./upload.md)）。
- 新代码从 `../http-api` 引入（`get` / `post` / `put` / `del` / `upload`）。
- `get`/`post`/`put`/`del`（…, `{ extra }`）写入 axios `bdExtra`；拦截器 resolve `ExtraModel`、解析 `ResultModel`；壳层 `LoadingBridge` / `MessageTipsBridge` / `HttpCacheBridge` 注入 UI。
- **是否提示**：仅 `extra.showFailTips`（默认 `true`）/ `extra.showSuccessTips`（默认 `false`）。页面自行处理错误时传 `{ showFailTips: false }`（登录 / 注册 / 重置密码 / 改密 / 验证码 / 扫码轮询等）。
- **提示样式**：信封 `tipsType`（`showToast` / `showDialog` / `showSnackBar`）；未传默认 toast。
- `-2` / `1001` 走 refresh / 登录跳转，不弹 tip。
- Web 默认 **不**开全局 lazy loading（避免与 Query 闪屏）；需蒙层时显式 `extra: { showLoading: true }`。
- GET + `extra.useCache: true`：内存短缓存 2s；路由切换 / `clearSession` 清空。
- 默认带 `Authorization: Bearer <token>`（`localStorage.accessToken`）。
- `code === -2`：单飞 refresh 后重试原请求一次；失败再清会话跳登录。
- `code === 1001`：清会话并跳转 `/login`（`setUnauthorizedHandler` 可注入路由）。
- `ApiError` / `TransportError` 的 `failTipsShown` 为 true 时 UI 勿再 toast（用 `toastRequestError`）。
- 分页：`PageMeta` / `PagerModel`（`items` + `meta`）；未知业务码展示 API `message`。
- `baseURL`：`VITE_API_BASE_URL`，默认 `/api`（开发代理到 blue-dock-java）。

## 服务端状态：TanStack Query

| 场景   | 做法                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| 读接口 | `useQuery`；`queryKey` 含资源与筛选参数                                           |
| 写接口 | `useMutation`；成功后 `invalidateQueries` 或乐观更新                              |
| 实时   | WS 帧到达后按 `type` 失效对应 key（如 `['dialogs']`、`['project', id, 'tasks']`） |

示例 key：`['projects']`、`['project', projectId]`、`['dialogs']`、`['dialog', dialogId, 'messages']`、`['attendance', yearMonth]`。

## 客户端状态：Zustand

窗口几何、壳层 UI、主题/语言、IM 草稿与多选、仪表盘布局偏好等（可 persist）。不存应用务权威数据。

持久化用 **Zustand `persist`**（不引入 Redux / `redux-persist`）：

- 白名单 `partialize`；键前缀 `blue-dock:<scope>`，按 `userId` 隔离（`packages/app/src/stores/persist.ts`）
- Token 只走 `@blue-dock/api` session（`localStorage.accessToken`），不进 Zustand
- 登录 / 登出调用 `bindPersistAfterLogin` / `clearPersistAfterLogout` 切换作用域并 rehydrate

## WebSocket

对接 [realtime.md](../../../blue-dock-java/docs/architecture/realtime.md)：

- 客户端：`packages/api/src/ws`（`realtimeClient` / `useRealtime`）；路径 `/ws`，握手 `?token=` + `client`/`platform`
- `platform` 缺省与 HTTP `X-Platform` 一致（`getRequestPlatform()`）；壳层仍可显式传入 `usePlatform()`
- 心跳：每 30s 发 `{"type":"ping"}`；断线指数退避（1s→30s）
- 开连 / 重连：本地无 access 时先单飞 `ensureRefreshedAccessToken`，仍无 token 则保持 closed（不再空转重试）
- 默认帧处理：`createDefaultFrameHandler` 按 type 用域 Query Key 工厂失效 / 补丁（`dialogKeys` / `projectKeys` / `taskKeys` / `dashboardKeys` / `appsKeys` / `presenceKeys`）；`presence.*` 补丁缓存后失效；`operation` → 本端执行并上行 `operationResult`；未知 type 忽略
- Manage 壳挂载 `useRealtime`；登出 / 卸载时断开
- Electron 可在自定义 `onFrame` 里再调 `desktop.notify` / `setBadge`

## 上传

按 [infra/upload.md](../../../blue-dock-java/docs/infra/upload.md) 分片；业务侧只提交返回的 objectId。

## Electron

HTTP / WS 在渲染进程；通知与角标走 preload。主进程不直连业务 API。
