# Agent 配置（唯一内容源）

跨工具共用目录，遵循 [Agent Skills](https://agentskills.io) / `.agents` 约定。  
适用：**Cursor**、**Claude Code**、**Codex**，以及其他会扫描 `.agents/` / `AGENTS.md` 的 agent 运行时。

请只在 `.agents/` 与根目录 `AGENTS.md` / `CLAUDE.md` 编辑。

## 目录

| 路径                     | 说明                                                                  |
| ------------------------ | --------------------------------------------------------------------- |
| `rules/*.md`             | 项目规则（YAML frontmatter：`description` / `alwaysApply` / `globs`） |
| `skills/<name>/SKILL.md` | Agent Skills（`name` + `description`）                                |
| `commands/`              | 自定义 commands（Claude 经 symlink；亦可直接读或用 skill）            |

## 各工具如何发现

| 工具        | 启动指令                   | rules                                                             | skills                              |
| ----------- | -------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| Cursor      | 根目录 `AGENTS.md`         | **须主动 Read** `.agents/rules/`                                  | `.agents/skills/`                   |
| Claude Code | `CLAUDE.md` → `@AGENTS.md` | `.claude/rules` → symlink；`settings.json` 可直指 `.agents/rules` | `.agents/skills` / `.claude/skills` |
| Codex       | 根目录 `AGENTS.md`         | **须主动 Read** `.agents/rules/`                                  | `.agents/skills`                    |
| 其他        | 优先 `AGENTS.md`           | 按 `AGENTS.md` 表格读取                                           | `.agents/skills/<name>/SKILL.md`    |

## 工具专属

| 文件                          | 工具                                        |
| ----------------------------- | ------------------------------------------- |
| 根目录 `AGENTS.md`            | Cursor / Codex 等跨工具启动指令（铁律摘要） |
| 根目录 `CLAUDE.md`            | Claude Code：`@AGENTS.md` + 项目手册        |
| `.claude/settings.json`       | Claude Code 权限 / hooks / rules 入口       |
| `.claude/settings.local.json` | 本机 Claude 权限（gitignore）               |

## 编辑约定

1. 改规则 / skill / command → 只改 `.agents/`
2. 不要维护双份拷贝
3. 新 skill 必须是 `skills/<name>/SKILL.md`

## 现有 skills

| Skill                 | 用途                                  |
| --------------------- | ------------------------------------- |
| `check`               | typecheck + ESLint + madge + 单元测试 |
| `create-app`          | 新建 / 补齐 `apps/<name>` 壳          |
| `create-component`    | 在 app 内新建 HeroUI 业务壳组件       |
| `create-hook`         | 新建 `@blue-dock/api` Query hook      |
| `crud`                | api + app feature 完整 CRUD           |
| `i18n`                | 添加中英文翻译 key                    |
| `karpathy-guidelines` | 应用行为准则审查                      |
| `code-reviewer`       | 按规则审查代码变更                    |
| `security-delivery`   | 鉴权、敏感数据与跨端交付              |
| `test-generator`      | 生成 Vitest / Playwright 测试         |

## 现有 commands

| 命令                   | 说明                          |
| ---------------------- | ----------------------------- |
| `/check`               | → skill `check`               |
| `/create-app`          | → skill `create-app`          |
| `/create-component`    | → skill `create-component`    |
| `/create-hook`         | → skill `create-hook`         |
| `/crud`                | → skill `crud`                |
| `/i18n`                | → skill `i18n`                |
| `/karpathy-guidelines` | → skill `karpathy-guidelines` |

## 现有 rules

| 规则           | alwaysApply | 说明            |
| -------------- | ----------- | --------------- |
| `architecture` | ✅          | 依赖铁律        |
| `behavior`     | ✅          | Karpathy 行为   |
| `state`        | 按 globs    | Query / Zustand |
| `naming`       | 按 globs    | 命名与契约      |
| `components`   | 按 globs    | UI 规范         |
| `i18n`         | 按 globs    | 国际化          |
