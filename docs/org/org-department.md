# 部门组织（org-department）

路由建议：`/manage/department` · 应用「团队管理」· 优先级：P0 · 前端状态：wip（部门树 / 用户列表 / 创建用户 / 批量导入 / 副负责人）

## 能力

- 部门树、新建 / 编辑 / 删除 / 同步子部门成员。
- 管理员用户列表：搜索、分页、设管理员 / 临时帐号 / 离职交接。
- 创建用户（密码 RSA-OAEP）。
- **批量导入**：下载模板 → 预览 → 确认导入（`users/import/*`）。
- **副负责人**：`addDeputy` / `deleteDeputy`。

## React 要点

- `features/department/DepartmentPage` · `CreateUserModal` · `ImportUsersModal`

## API

[modules/org-department](../../../blue-dock-java/docs/modules/org-department/)
