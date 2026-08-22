---
name: i18n
description: 添加国际化翻译 key — 同时补充中文和英文
---

# 添加国际化 Key

## 翻译文件位置

```
packages/i18n/locales/zh-CN/<namespace>.json
packages/i18n/locales/en-US/<namespace>.json
```

命名空间：`common` + feature（`messenger`、`project`、`task`、`attendance`、`file`、`meeting`…）

## 步骤

1. **加 key**：在对应的 `zh-CN/` 和 `en-US/` JSON 文件中添加

```json
// zh-CN/task.json
{ "list": { "title": "任务" } }

// en-US/task.json
{ "list": { "title": "Tasks" } }
```

2. **使用**：

```tsx
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('task');
<Button>{t('list.title')}</Button>;
```

3. **运行检查**（落地后）：

```bash
bun run i18n-extract
```

## Key 命名

- 点号分层：`page.section.action`
- 示例：`task.list.search`、`messenger.composer.send`
- 相关 key 用同前缀分组
- 若全仓采用「中文原文即 key」，则中英资源仍成对维护展示文案，见 `docs/guide/i18n-and-theme.md`

## 动态内容

项目名、昵称、任务标题等不要放进翻译文件。由后端字段展示。
