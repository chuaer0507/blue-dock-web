# 测试约定

单元测试目录与源码 **同级**，禁止堆进 `src/`。

## 目录位置（强制）

每个 `packages/<name>/` 或 `apps/<name>/`：

```
packages/<name>/
├── src/                 # 源码
├── test/                # 单元测试（与 src 同级）
│   ├── http-api-request.test.ts
│   ├── auth/
│   │   └── session.test.ts
│   └── domains/
│       └── project.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts     # include: ['test/**/*.{test,spec}.ts']
```

| 规则   | 说明                                                                                |
| ------ | ----------------------------------------------------------------------------------- |
| 目录名 | 固定为 **`test/`**（不用 `__tests__`、不用 `tests`）                                |
| 位置   | 与 **`src/` 同级**；禁止 `src/**/*.test.ts`                                         |
| 文件名 | `*.test.ts` / `*.spec.ts`；可按源码子目录镜像（如 `test/auth/` ↔ `src/auth/`）      |
| E2E    | Playwright：`apps/web/e2e/` + `apps/web/playwright.config.ts`；根脚本 `bun run e2e` |
| import | 从 `test/` 引用源码用相对路径 `../src/...`                                          |

## Vitest

```ts
// packages/<name>/vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom', // 或 node（纯逻辑包）
    include: ['test/**/*.{test,spec}.ts'],
  },
});
```

## Playwright（Web E2E）

```bash
bun install
bunx playwright install chromium   # 首次
bun run e2e:smoke                  # 自动起 Vite 或复用已运行的 5173；无需账号
bun run e2e:auth                   # 真实后端登录态用例；需 E2E_EMAIL / E2E_PASSWORD
```

- 冒烟：`apps/web/e2e/smoke.spec.ts`（登录页可见、扫码切换、未登录 `/manage` → `/login?redirect=`、`/pro` 介绍页、`/preload` → `/login`）
- 登录进壳：设 `E2E_EMAIL` / `E2E_PASSWORD`（可选 `E2E_CAPTCHA`）后跑 `auth.spec.ts`（主导航：仪表盘 / 消息 / 项目 / 日历 / 文件）；共用 `e2e/helpers/login.ts`
- 已有 dev server：`PLAYWRIGHT_SKIP_WEBSERVER=1 bun run e2e:smoke`（登录态同理替换为 `e2e:auth`）。

## 示例（`@blue-dock/api`）

```
packages/api/src/http-api.ts
packages/api/test/http-api-request.test.ts

packages/api/src/auth/session.ts
packages/api/test/auth/session.test.ts
```

Agent / 编码细则：`.agents/rules/naming.md` · skill `test-generator`。
