---
description: 状态管理分离 — TanStack Query / Zustand / WS 的职责边界
alwaysApply: false
globs:
  - 'packages/api/**'
  - 'packages/app/**'
  - 'apps/**'
---

# 状态管理规则

## 三类状态，三条管道，互不重叠

| 数据来源  | 用谁管                | 例子                          | 怎么用                     |
| --------- | --------------------- | ----------------------------- | -------------------------- |
| HTTP 请求 | **TanStack Query**    | 项目、任务、对话列表、设置    | `useQuery` / `useMutation` |
| WebSocket | **失效 / 补丁 Query** | `dialog.message`、`task.*`    | invalidate 或 patch cache  |
| 纯客户端  | **Zustand**           | 侧栏、主题、IM 草稿、布局偏好 | store + selector           |

**铁律：Query 权威数据不进 Zustand。** 进了 Query 缓存就别再塞一份列表进 store。

信封：`code === 0` 成功；`code === 1001` 清会话并跳转 `/login`。

## TanStack Query 规范

### Query Key 工厂（必须）

```ts
// ✅ 正确
export const projectKeys = {
  all: () => ['projects'] as const,
  list: () => [...projectKeys.all(), 'list'] as const,
  detail: (id: number) => [...projectKeys.all(), 'detail', id] as const,
};

// ❌ 错误 — 散落字符串
useQuery({ queryKey: ['projects', 'list'], ... })
```

工厂统一在 `@blue-dock/api` 域模块导出。

### 缓存策略建议

| 数据            | staleTime 建议 | 说明               |
| --------------- | -------------- | ------------------ |
| 项目 / 任务列表 | 30s–2min       | 写后主动失效       |
| 对话消息        | 0 + WS 补洞    | 首屏 HTTP，增量 WS |
| 系统设置        | 5–10 min       | 管理端变更后失效   |
| 搜索            | 0              | 按次查询           |
| 签到月视图      | 1–2 min        | key 含 `yearMonth` |

### Mutation 三件套（适用时必须）

```ts
useMutation({
  mutationFn: ...,
  onMutate:   async () => { /* 乐观更新 */ },
  onError:    (_err, _vars, ctx) => { /* 回滚到 ctx.previous */ },
  onSettled:  () => { queryClient.invalidateQueries(...) },
})
```

不适合乐观更新的写操作至少 `onSettled` 失效。

## WebSocket + 降级轮询

```
WS 在线 → 推送补洞 / invalidate → refetchInterval: false
WS 断线 → 关键列表 refetchInterval: 5000
WS 恢复 → 重订阅 + refetchInterval: false
```

```ts
function useDialogList(wsConnected: boolean) {
  return useQuery({
    queryKey: dialogKeys.list(),
    queryFn: () => get('dialog/lists'),
    refetchInterval: wsConnected ? false : 5000,
  });
}
```

帧类型对齐 java `architecture/realtime.md`；未知 type 安全忽略。

## Zustand

- 放 `packages/app/src/stores/`（或 feature 私有 store）
- persist 白名单最小化；键名按 `userId` 隔离
- 不存 Token 明文以外的多余敏感快照（Token 走 auth 模块）

详情：`docs/guide/state-and-api.md` · frontend-spec `references/coding.md`
