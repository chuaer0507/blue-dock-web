# 前端工程规范（入口）

AI 与开发统一遵循：

**[`.agents/skills/frontend-spec/SKILL.md`](../../.agents/skills/frontend-spec/SKILL.md)**

## 读什么

| 需求               | 文档                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------ |
| 工作流与铁律摘要   | [SKILL.md](../../.agents/skills/frontend-spec/SKILL.md)                                    |
| 包边界 / 分层      | [architecture.md](../../.agents/skills/frontend-spec/references/architecture.md)           |
| 命名 / UI / 质量   | [coding.md](../../.agents/skills/frontend-spec/references/coding.md)                       |
| 鉴权 / 桌面 / 交付 | [security-delivery.md](../../.agents/skills/frontend-spec/references/security-delivery.md) |
| 安全基线           | [secure-baseline.md](../../.agents/skills/frontend-spec/references/secure-baseline.md)     |
| ADR / 门禁         | [governance.md](../../.agents/skills/frontend-spec/references/governance.md)               |
| PR / 评审清单      | [checklists.md](../../.agents/skills/frontend-spec/references/checklists.md)               |
| 示例               | [examples.md](../../.agents/skills/frontend-spec/references/examples.md)                   |
| 短规则             | [`.agents/rules/`](../../.agents/rules/)                                                   |

## 与现有 guide 的关系

| guide                                                       | 角色                             |
| ----------------------------------------------------------- | -------------------------------- |
| [tech-stack.md](./tech-stack.md)                            | 技术选型与版本策略               |
| [architecture.md](./architecture.md)                        | 产品侧架构说明                   |
| [api.md](./api.md) / [state-and-api.md](./state-and-api.md) | 接口消费与状态习惯               |
| [testing.md](./testing.md)                                  | 单元测试目录（`test/` ∥ `src/`） |
| **frontend-spec（本页）**                                   | 编码边界、门禁、评审与 AI 工作流 |

冲突时：包边界与编码铁律以 frontend-spec / `.agents/rules` 为准；URL 与字段以 **blue-dock-java** 为准；产品能力以 `docs/` 业务文档为准。
