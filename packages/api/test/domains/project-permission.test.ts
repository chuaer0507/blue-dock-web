import { describe, expect, it } from 'vitest';
import {
  projectAllowsPoint,
  projectMemberHasAnyPoint,
  projectMemberHasPoint,
  type ProjectPermissionView,
} from '../../src/domains/project';

const view: ProjectPermissionView = {
  projectId: 1,
  isPersonal: 0,
  points: [],
  permissions: {
    project_member: ['TASK_ADD'],
    task_leader: ['TASK_UPDATE'],
    task_assist: ['TASK_TIME'],
  },
};

describe('项目权限矩阵', () => {
  it('成员仅拥有 project_member 中的权限点', () => {
    expect(projectMemberHasPoint(0, view, 'TASK_ADD')).toBe(true);
    expect(projectMemberHasAnyPoint(0, view, ['TASK_STATUS', 'TASK_ADD'])).toBe(true);
    expect(projectMemberHasPoint(0, view, 'TASK_UPDATE')).toBe(false);
  });

  it('负责人和协助人可叠加对应角色权限', () => {
    expect(projectAllowsPoint(0, view, 'TASK_UPDATE', { isTaskLeader: true })).toBe(true);
    expect(projectAllowsPoint(0, view, 'TASK_TIME', { isTaskAssist: true })).toBe(true);
    expect(projectAllowsPoint(0, view, 'TASK_TIME')).toBe(false);
  });

  it('拥有者和管理员不受矩阵限制', () => {
    expect(projectAllowsPoint(1, undefined, 'TASK_REMOVE')).toBe(true);
  });
});
