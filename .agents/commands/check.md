---
description: 运行全部代码检查
---

按 skill [check](../skills/check/SKILL.md) 执行：

```bash
bun run typecheck
bun run lint
bun run lint:circular
bun run format:check
bun run test
```

通过后按 [architecture.md](../rules/architecture.md) 核对依赖方向是否违反铁律。
