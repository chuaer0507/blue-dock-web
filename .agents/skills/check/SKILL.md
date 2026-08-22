---
name: check
description: 运行 typecheck / ESLint 依赖方向检查 + madge 循环依赖检测 + 单元测试
---

# 代码检查

## 运行

```bash
bun run typecheck
bun run lint            # ESLint（含依赖方向规则）
bun run lint:circular   # madge 循环依赖检测
bun run format:check    # Prettier
bun run test            # 单元测试
```

## ESLint 强制项

| 规则                              | 含义                  |
| --------------------------------- | --------------------- |
| `packages/api` 不得 from `apps/*` | api 不能反向引用壳层  |
| （已无 `packages/ui`）            | UI 在 app 内用 HeroUI |
| `packages/*` 不得 from `apps/*`   | 包不能引用壳          |

## 发现违规时的修复

**ui → api/app：** 把 hook 调用提升到 feature / page，结果通过 props 向下传。

**api → apps：** 把共享代码移到 `@blue-dock/api` 或 `@blue-dock/app`。

**A ↔ B 循环：** 提取公共类型/逻辑到独立文件，打断环。

详细规则见 [architecture.md](../../rules/architecture.md)。
