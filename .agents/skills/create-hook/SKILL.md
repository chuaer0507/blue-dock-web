---
name: create-hook
description: 按 Query Key 工厂 + 乐观更新模式在 @blue-dock/api 中创建 TanStack Query hook
---

# 创建 Query Hook

设计前可先扫 [frontend-spec](../frontend-spec/SKILL.md)：

- 状态归属 → `references/coding.md` §5 / `rules/state.md`
- API 示例 → `references/examples.md` §3.2–3.3

## 检查清单

- [ ] 路径已在 blue-dock-java `api-contract.md` / `modules/*/api.md` 确认？
- [ ] Query Key 用了工厂模式（`xxxKeys.all()`）而不是内联数组？
- [ ] 文件放在 `packages/api/src/domains/<domain>.ts`（或等价）？
- [ ] 需要降级轮询的 hook 接受了 `wsConnected: boolean` 参数？
- [ ] Mutation 有乐观更新 + 错误回滚 + `onSettled` 失效（适用时）？
- [ ] 领域名是否误用 `checkin`/`signin`？（应 `attendance`）

## 文件位置

```
packages/api/src/domains/<domain>.ts
packages/api/test/domains/<domain>.test.ts
```

## 读 Hook 模板

```ts
import { useQuery } from '@tanstack/react-query';
import { get } from '../http-api';

export const <domain>Keys = {
  all: () => ['<domain>'] as const,
  list: () => [...<domain>Keys.all(), 'list'] as const,
  detail: (id: number | string) => [...<domain>Keys.all(), 'detail', id] as const,
};

export function use<Entity>List(wsConnected?: boolean) {
  return useQuery({
    queryKey: <domain>Keys.list(),
    queryFn: () => get('<resource>/<action>'),
    staleTime: 60_000,
    refetchInterval: wsConnected === false ? 5000 : false,
  });
}
```

## 写 Hook 模板

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '../http-api';

export function useUpdate<Entity>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item) => post('<resource>/<action>', item),
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: <domain>Keys.list() });
      const previous = queryClient.getQueryData(<domain>Keys.list());
      // 乐观更新…
      return { previous };
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(<domain>Keys.list(), ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: <domain>Keys.all() });
    },
  });
}
```

## 完成后

1. 从 `@blue-dock/api` 导出 hook 和 keys
2. 添加单元测试
3. Feature 页组装；同步 `docs/` 对应模块文档
