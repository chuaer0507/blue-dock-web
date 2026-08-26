# 管理扩展（admin-extras）

前端状态：done（ldap / complaint / license / uploads；合规预留）

| 能力       | 路由 / 入口                            | 说明                                                |
| ---------- | -------------------------------------- | --------------------------------------------------- |
| License    | `/manage/setting/license`              | 超管                                                |
| LDAP       | `/manage/admin/ldap`                   | 目录同步                                            |
| 举报       | `/manage/admin/complaint` · 会话头举报 | 滥用举报（提交含可选附图；管理端展示附图）          |
| 个人群检索 | `/manage/admin/user-groups`            | 管理员按名搜普通个人群（`dialog/group/searchUser`） |
| 合规       | 预留（无独立面板，见 java compliance） | P2                                                  |
| 搜索重建   | 搜索页管理员区                         | 索引重建（已接）                                    |

## API

[modules/license](../../../blue-dock-java/docs/modules/license/) · [ldap](../../../blue-dock-java/docs/modules/ldap/) · [abuse-report](../../../blue-dock-java/docs/modules/abuse-report/) · [compliance](../../../blue-dock-java/docs/modules/compliance/)
