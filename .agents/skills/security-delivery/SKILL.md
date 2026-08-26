---
name: security-delivery
description: 处理 Blue Dock 的鉴权、敏感数据、上传、微应用与跨端交付；仅在涉及这些安全或平台边界时使用。
---

# 安全与跨端交付

用于鉴权、会话、密码、上传、WebSocket、微应用、Electron、Mobile 或发布安全相关的设计、实现和审查。普通前端功能不必加载本技能。

## 先确认的边界

1. URL、字段、信封和 WebSocket 事件以 `blue-dock-java` 契约为准；前端不自造别名或接口。
2. 业务 HTTP / WS 经 `@blue-dock/api`；业务 UI 在 `@blue-dock/app`；平台能力仅经 bridge。
3. 密码链路、Token 刷新、未授权处理以 `docs/guide/state-and-api.md` 的当前实现为准：密码密文使用 `keyId`，而非旧的 `kid` 表述。
4. 交付前按变更风险运行相应检查，并说明功能级回归范围；不要只验证当前 diff。

## 按需读取

- 鉴权、权限、实时、上传、微应用、Electron / Mobile 与回归：读 [references/security-delivery.md](references/security-delivery.md)。
- 密钥、环境变量、输入输出、敏感数据、供应链与发布：读 [references/secure-baseline.md](references/secure-baseline.md)。
- PR、评审、上线清单和 ADR 模板：读 [code-reviewer 的清单](../code-reviewer/references/checklists.md)。

高风险链路应明确失败、取消、登出与无壳降级路径；不得通过静默回退、前端隐藏权限或敏感日志掩盖失败。
