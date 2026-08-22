# 目录模板与代码示例

> 常见实现示例，不构成对具体依赖版本的强制绑定；项目已有等价能力时优先沿用。

## 目录

- [1. 目录模板清单](#1-目录模板清单)
- [2. 单流程标准写法](#2-单流程标准写法)
- [3. 代码示例](#3-代码示例)

## 1. 目录模板清单

### 1.1 api

```text
packages/api/src/
├─ http-api.ts
├─ client.ts
├─ auth/
│  ├─ token.ts
│  └─ passwordCipher.ts
├─ ws/
│  └─ client.ts
├─ upload/
├─ domains/
│  ├─ project.ts
│  ├─ task.ts
│  ├─ dialog.ts
│  ├─ attendance.ts
│  └─ …
└─ index.ts
```

### 1.2 UI（在 app 内）

```text
packages/app/src/
├─ components/              # 仅页面级业务组装（如 PlaceholderPage）
├─ providers/
│  ├─ ThemeProvider.tsx
│  └─ ErrorBoundary.tsx
```

直连 `@heroui/react` / `@heroicons/react`，**无** `ui.ts` 桶导出。

### 1.3 app

```text
packages/app/src/
├─ routes/
├─ layouts/
├─ features/
│  ├─ messenger/
│  ├─ project/
│  ├─ task/
│  ├─ attendance/
│  └─ …
├─ stores/
├─ components/
└─ main.tsx          # 或由 apps 挂载入口组件
```

### 1.4 apps

```text
apps/web/
├─ index.html
├─ src/main.tsx
├─ vite.config.ts    # extend config
└─ .env.development

apps/desktop/
├─ src/main/
├─ src/preload/
└─ …
```

### 1.5 config

```text
packages/config-eslint/
packages/config-vite/     # 或合并为 config
# vite.base.ts / eslint.base.js / tailwind.base.js
```

## 2. 单流程标准写法

### 2.1 列表页加载

1. Page 调用 `useProjectList()`（`@blue-dock/api`）。
2. Query 按 Key 工厂缓存；写后 invalidate。
3. UI 按 loading / error / empty / content 渲染。
4. Mutation 乐观更新 + 回滚 + `onSettled` invalidate。

### 2.2 WS 补洞

1. 登录后建立 `/ws`。
2. 收到 `dialog.message` → 更新对应消息 cache 或 invalidate。
3. 断线 → 关键列表短轮询；恢复 → 关闭轮询并补拉。

### 2.3 新增共享 API + Query hook

1. 确认 java `api-contract.md` / `modules/*/api.md` 已有路径。
2. 类型 + `get`/`post` + Key 工厂 + hooks 进 `@blue-dock/api`。
3. Feature Page 组装；i18n；更新 `docs/`。

### 2.4 登录

1. `GET api/users/key/client`。
2. `encryptPassword` → RSA-OAEP + `keyId`。
3. `post('users/login', …)`；存 token；连 WS。

## 3. 代码示例

### 3.1 统一 http-api

```ts
import { get, post } from '../http-api';

// GET 查询 / POST 写入；信封解包与 tip 已在 http-api 内处理
const list = await get<ProjectView[]>('project/lists');
await post('project/add', { name: 'x' });
```

### 3.2 Query Key 工厂 + hook

```ts
export const projectKeys = {
  all: () => ['projects'] as const,
  list: () => [...projectKeys.all(), 'list'] as const,
  detail: (id: number) => [...projectKeys.all(), 'detail', id] as const,
};

export function useProjectList() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => get('project/lists'),
  });
}
```

### 3.3 Mutation 三件套

```ts
useMutation({
  mutationFn: (vars) => post('project/task/update', vars),
  onMutate: async (vars) => {
    await queryClient.cancelQueries({ queryKey: taskKeys.detail(vars.taskId) });
    const previous = queryClient.getQueryData(taskKeys.detail(vars.taskId));
    // 乐观更新…
    return { previous };
  },
  onError: (_err, vars, ctx) => {
    if (ctx?.previous) queryClient.setQueryData(taskKeys.detail(vars.taskId), ctx.previous);
  },
  onSettled: (_d, _e, vars) => {
    queryClient.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) });
  },
});
```

### 3.4 Zustand 壳层状态

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ShellState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
};

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'shell', partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }) },
  ),
);
```

### 3.5 页面三态组装

```tsx
export function ProjectsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useProjectList();

  if (isLoading && !data) return <Spinner />;
  if (isError && !data) return <ErrorState onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState message={t('project.list.empty')} />;
  return <ProjectList items={data} />;
}
```

### 3.6 勿自造 UI 封装

优先直接使用 `@heroui/react` 组件（`Button` / `Modal` / `Form` / `TextField`…），不要再写一层薄包装再导出。

### 3.7 密码上送

```ts
const key = await get<PublicKeyData>('users/key/client');
const enc = await encryptPassword(plainPassword, key);
await post('users/login', { email, password: enc.password, keyId: enc.keyId });
```

### 3.8 WS 降级轮询

```ts
function useDialogList(wsConnected: boolean) {
  return useQuery({
    queryKey: dialogKeys.list(),
    queryFn: () => get('dialog/lists'),
    refetchInterval: wsConnected ? false : 5000,
  });
}
```

### 3.9 i18n

```tsx
const { t } = useTranslation();
return <Button>{t('task.list.title')}</Button>;
```

### 3.10 反模式对照

| 反模式                         | 正确做法                            |
| ------------------------------ | ----------------------------------- |
| `ui` import `api`              | 状态在 Page/feature，props 下传     |
| 内联 `queryKey: ['projects']`  | `projectKeys.list()`                |
| Mutation 无回滚 / 失效         | 乐观更新 + onError 回滚 + onSettled |
| 硬编码「提交」                 | `t('…')`                            |
| 模型 `password` 字段           | `hasPassword`                       |
| app 壳内复制 vite 全量配置     | extend `@blue-dock/config*`         |
| HTTP 列表放 Zustand            | TanStack Query                      |
| 渲染进程 `require('electron')` | `desktop-bridge`                    |
| 路径用 `checkin` / `signin`    | `attendance`                        |
| 前端自造 meeting close API     | 依赖后端关房调度 / 卡片更新         |
| 绕过 java 契约改字段名         | 先改 blue-dock-java，再改消费侧     |
