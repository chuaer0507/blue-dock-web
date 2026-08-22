# 参考导航

按任务打开文件，勿整本通读。各文件文首有摘要与目录，章节号从 **1** 起独立编号。

## 规则等级

| 等级 | 含义                     |
| ---- | ------------------------ |
| 必须 | 新代码与改动区域默认强制 |
| 推荐 | 优先采用；存量可渐进     |
| 可选 | 按复杂度 / 合规成本选用  |

## 按任务选读

| 任务                     | 文件                                         |
| ------------------------ | -------------------------------------------- |
| 包拆分 / 依赖边界        | [architecture.md](architecture.md)           |
| 命名 / 注释 / UI / 质量  | [coding.md](coding.md)                       |
| 鉴权 / 桌面 / 回归       | [security-delivery.md](security-delivery.md) |
| 密钥 / 密码 / 敏感数据   | [secure-baseline.md](secure-baseline.md)     |
| 兼容 / ADR / 门禁 / 文档 | [governance.md](governance.md)               |
| PR / 评审 / 上线清单     | [checklists.md](checklists.md)               |
| 目录与代码示例           | [examples.md](examples.md)                   |

## 与 `.agents/rules/` 的关系

| 主题                   | 权威规则文件            |
| ---------------------- | ----------------------- |
| 三条铁律 / 分层        | `rules/architecture.md` |
| 状态 / Query / Zustand | `rules/state.md`        |
| 命名 / 路由 / 契约     | `rules/naming.md`       |
| UI / a11y / Provider   | `rules/components.md`   |
| i18n / 硬编码文案      | `rules/i18n.md`         |
| 行为准则               | `rules/behavior.md`     |

本 skill 是统一工作流入口；条文冲突时以 `rules/` 为准。产品能力与接口冲突时：业务以 `docs/` 为准，URL/字段以 blue-dock-java 为准。

## 文件与章节

| 文件                                         | 章节                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)           | 1 目标 · 2 原则 · 3 用法 · 4 包拓扑 · 5 拆分 · 6 分层边界（含违规速查 / 桌面 / mock） |
| [coding.md](coding.md)                       | 1 命名 · 2 注释 · 3 模型与 API · 4 UI/主题/i18n · 5 状态错误渲染 · 6 代码质量         |
| [security-delivery.md](security-delivery.md) | 1 鉴权权限 · 2 实时上传桌面 · 3 平台兼容 · 4 测试交付 · 5 团队落地                    |
| [secure-baseline.md](secure-baseline.md)     | 1 密钥配置 · 2 输入输出 · 3 敏感数据 · 4 供应链发布 · 5 与总清单                      |
| [governance.md](governance.md)               | 1 规则等级 · 2 兼容演进 · 3 README/ADR · 4 门禁 · 5 评审治理                          |
| [checklists.md](checklists.md)               | 1 原则 · 2 feature README · 3 ADR · 4 PR · 5 评审 · 6 上线 · 7 gitignore              |
| [examples.md](examples.md)                   | 1 目录模板 · 2 单流程 · 3 代码示例（含反模式表）                                      |
