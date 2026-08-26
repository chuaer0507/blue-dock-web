# 模板与检查清单

> Feature 文档、ADR、PR 自检、代码评审与上线清单的单一事实源。

## 目录

- [1. 模板使用原则](#1-模板使用原则)
- [2. Feature 文档模板](#2-feature-文档模板)
- [3. ADR 模板](#3-adr-模板)
- [4. PR 自检清单](#4-pr-自检清单)
- [5. 代码评审清单](#5-代码评审清单)
- [6. 交付与上线总清单](#6-交付与上线总清单)
- [7. 通用 `.gitignore` 基线示例](#7-通用-gitignore-基线示例)

## 1. 模板使用原则

- 模板用于统一最低表达口径，不要求逐字照抄
- 可按项目裁剪，但核心信息项不要删空
- checklist 用于防遗漏，不要写成形式化打钩文件

## 2. Feature 文档模板

```md
# 功能名称

## 目标

一句话说明解决什么问题。

## 涉及包

- packages/app/features:
- packages/api:
- packages/app/src/components（仅页面级组装，勿造通用封装）:

## 主流程

- 流程 1：
- 流程 2：

## 关键模型 / API / WS

- 模型：
- REST（链到 blue-dock-java modules/*/api.md）：
- WebSocket：

## 状态

- Query hooks / Keys：
- Zustand stores：
- 本地存储 / persist：

## UI 与 i18n

- 主要页面 / 组件：
- 新增 i18n key：

## 风险点与回归范围

- 风险：
- 回归页面 / 链路：
```

## 3. ADR 模板

```md
# ADR: 决策标题

## 背景

当前问题、上下文和约束。

## 决策

最终采用的方案。

## 备选方案

- 方案 A：
- 方案 B：

## 取舍理由

为什么选当前方案。

## 影响范围

- 包 / 端：
- API / 存储 / 桌面：
- 文档 / CI：

## 后续约束

- 约束 1：
- 约束 2：
```

## 4. PR 自检清单

提交 PR 或提测前至少确认：

1. 依赖方向是否符合铁律（api 无 JSX、packages 不 import apps、无独立 ui 包）。
2. HTTP 是否走 Query；壳层 UI / 草稿是否走 Zustand；WS 是否正确失效补洞。
3. Query Key 是否工厂模式；Mutation 是否具备回滚 / onSettled 失效（适用时）。
4. 业务是否在 `@blue-dock/app`；壳层是否保持薄；构建是否 extend config。
5. 路径 / 字段是否对齐 blue-dock-java；无 `checkin`/`signin` 误用。
6. 是否优先 HeroUI / `@heroui/react`；是否有必要 a11y。
7. 用户文案是否走 `t()`；空错态是否完整。
8. 密码是否 RSA + kid（生产路径）；Token / shareKey 是否脱敏。
9. Electron / bridge 分支是否避免 Web 崩溃。
10. 是否误用 eslint-disable 压制架构规则；是否误提交 env 密钥、构建产物。
11. 是否跑过 `typecheck` / `lint` / `lint:circular` / `test`（及必要的 build / e2e）。
12. 是否同步 `docs/`；架构决策是否补 ADR。
13. 是否对该功能相关链路全量回归，而不只测本次 diff。

## 5. 代码评审清单

评审时至少检查：

1. 分层职责是否清晰，是否把 JSX 塞进 `api` 或误恢复 `@blue-dock/ui`。
2. 是否把可共享逻辑错误滞留在 `apps/*` 壳层。
3. 命名、路由、领域 id、i18n 是否规范。
4. Query Key / Mutation / persist 白名单是否正确。
5. Zustand 是否误存 HTTP 权威列表；Query 是否误当 WS 唯一真相而不补洞。
6. API 组织、拦截器、`code===1001` 行为是否合理。
7. 是否优先 HeroUI / `@heroui/react`；主题 / a11y 是否达标。
8. 三态渲染是否正确。
9. 上传、会议、微应用桥是否正确。
10. 密码 wire、Token 日志脱敏、敏感存储是否合规。
11. 桌面降级与 bridge 是否完整。
12. 是否吞异常、空 catch、失败当成功、只前端隐藏权限。
13. 测试、文档是否同步。
14. 是否引入兼容性、安全或发版风险。

## 6. 交付与上线总清单

提测、交付、上线前统一检查：

1. 包边界清晰，UTF-8 与目录卫生合格。
2. 无魔法散落、无兜底 Constants 大杂烩、无硬编码用户文案。
3. 关键类 / 方法 / 字段 / 分支注释与业务语义对齐。
4. 鉴权、会话清理、权限入口完整；密码 RSA 合规。
5. 敏感信息不进日志 / Toast / 微应用明文滥用。
6. 上传、WS、URL、微应用 postMessage 等高风险边界已校验。
7. 无硬编码密钥、无危险调试开关、无误提交本地密钥文件。
8. `typecheck` / `lint` / `lint:circular` / `test` 通过；无假绿。
9. 功能级全量回归完成；鉴权 / 上传 / 会议 / 桌面已冒烟。
10. 如适用，已更新 docs、ADR、发版说明；Web + Desktop 构建抽查通过。

## 7. 通用 `.gitignore` 基线示例

```gitignore
# OS
.DS_Store
Thumbs.db

# IDE
.idea/
*.iml
.vscode/*

# Node / Bun / build
node_modules/
dist/
coverage/
*.log
tmp/
temp/

# Env secrets
.env.local
.env.*.local
apps/*/.env.local

# Electron
out/
release/

# Local drop
releases/
```

补充说明：

- `.gitignore` 不替代目录治理；废弃代码与空目录仍应删除
- 团队共享的 `.env.development` 若需入库，不得含真实生产密钥
- 不要把正式 scripts / 共享 hooks / CI 配置误加入忽略列表
