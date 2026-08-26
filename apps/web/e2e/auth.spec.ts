import { test, expect } from '@playwright/test';
import { e2eCredentials, loginWithEnv } from './helpers/login';

/**
 * 需真实后端 + 账号：
 * E2E_EMAIL / E2E_PASSWORD（可选 E2E_CAPTCHA 若需验证码）
 */
test.describe('登录进壳层', () => {
  test.skip(!e2eCredentials(), '未设置 E2E_EMAIL / E2E_PASSWORD，跳过');

  test('使用环境变量账号登录', async ({ page }) => {
    await loginWithEnv(page);
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('登录后主导航可进入仪表盘 / 消息 / 项目 / 日历 / 文件', async ({ page }) => {
    await loginWithEnv(page);
    await expect(page.getByRole('navigation').first()).toBeVisible();

    await page
      .getByRole('link', { name: /仪表盘|Dashboard/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/manage\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /仪表盘|Dashboard/i })).toBeVisible();
    await page.getByRole('button', { name: /刷新|Refresh/i }).click();

    await page
      .getByRole('link', { name: /消息|Messenger|Messages/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/manage\/messenger/, { timeout: 15_000 });

    await page
      .getByRole('link', { name: /项目|Projects?/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/manage\/project/, { timeout: 15_000 });

    await page
      .getByRole('link', { name: /日历|Calendar/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/manage\/calendar/, { timeout: 15_000 });

    await page
      .getByRole('link', { name: /文件|Files?/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/manage\/file/, { timeout: 15_000 });
  });

  test('可创建项目、切换视图并软删临时项目', async ({ page }) => {
    await loginWithEnv(page);
    const projectName = `E2E 项目 ${Date.now()}`;
    let projectId: string | null = null;

    try {
      await page.goto('/manage/project');
      if (/\/manage\/project$/.test(new URL(page.url()).pathname)) {
        await page.getByRole('button', { name: /新建项目|New project/i }).click();
      } else {
        await expect(page).toHaveURL(/\/manage\/project\/\d+/, { timeout: 15_000 });
        await page.locator('aside').getByRole('button', { name: '+' }).click();
      }
      await expect(page.getByRole('heading', { name: /新建项目|New project/i })).toBeVisible();
      await page.locator('input[name="name"]').last().fill(projectName);
      await page.getByRole('checkbox', { name: /启用默认工作流|Enable default workflow/i }).click();
      await page.getByRole('button', { name: /创建项目|Create project/i }).click();
      await expect(page).toHaveURL(/\/manage\/project\/\d+/, { timeout: 15_000 });

      const match = /\/manage\/project\/(\d+)/.exec(page.url());
      projectId = match?.[1] ?? null;
      expect(projectId).toBeTruthy();
      await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

      await page.getByRole('radio', { name: /列表|List/i }).click();
      await expect(page.getByRole('table', { name: /列表|List/i })).toBeVisible();

      await page.getByRole('radio', { name: /甘特|Gantt/i }).click();
      await expect(page.getByText(/暂无带日期的任务|No scheduled tasks/i)).toBeVisible();

      await page.getByRole('radio', { name: /工作流|Workflow/i }).click();
      await expect(page.getByText(/待处理|To do/i).first()).toBeVisible();
    } finally {
      if (projectId) {
        const token = await page.evaluate(() => localStorage.getItem('accessToken'));
        const response = await page.request.get(`/api/project/remove?projectId=${projectId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        expect(response.ok()).toBeTruthy();
        expect((await response.json()).code).toBe(0);
      }
    }
  });

  test('可在独立详情页完成、重开并添加子任务', async ({ page }) => {
    await loginWithEnv(page);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const projectName = `E2E 任务项目 ${Date.now()}`;
    let projectId: string | null = null;
    let taskId: string | null = null;

    try {
      const projectResponse = await page.request.get(
        `/api/project/add?name=${encodeURIComponent(projectName)}`,
        { headers },
      );
      expect(projectResponse.ok()).toBeTruthy();
      const projectPayload = await projectResponse.text();
      const projectResult = JSON.parse(projectPayload);
      expect(projectResult.code).toBe(0);
      projectId = /"id":(\d+)/.exec(projectPayload)?.[1] ?? null;
      expect(projectId).toBeTruthy();

      const taskName = `E2E 任务 ${Date.now()}`;
      const taskResponse = await page.request.post(
        `/api/project/task/add?projectId=${projectId}&name=${encodeURIComponent(taskName)}`,
        { headers },
      );
      expect(taskResponse.ok()).toBeTruthy();
      const taskPayload = await taskResponse.text();
      const taskResult = JSON.parse(taskPayload);
      expect(taskResult.code).toBe(0);
      taskId = /"id":(\d+)/.exec(taskPayload)?.[1] ?? null;
      expect(taskId).toBeTruthy();

      await page.goto(`/single/task/${taskId}`);
      await expect(page.locator('input[name="name"]')).toHaveValue(taskName);

      await page.getByRole('button', { name: /完成|Complete/i }).click();
      await expect(page.getByRole('button', { name: /重新打开|Reopen/i })).toBeVisible();
      await page.getByRole('button', { name: /重新打开|Reopen/i }).click();
      await expect(page.getByRole('button', { name: /完成|Complete/i })).toBeVisible();

      const subtaskName = `E2E 子任务 ${Date.now()}`;
      await page.getByLabel(/子任务名称|Subtask name/i).fill(subtaskName);
      await page.getByLabel(/子任务名称|Subtask name/i).press('Enter');
      await expect(page.getByText(subtaskName)).toBeVisible();
    } finally {
      if (taskId) {
        const taskResponse = await page.request.get(`/api/project/task/remove?taskId=${taskId}`, {
          headers,
        });
        expect(taskResponse.ok()).toBeTruthy();
        expect((await taskResponse.json()).code).toBe(0);
      }
      if (projectId) {
        const response = await page.request.get(`/api/project/remove?projectId=${projectId}`, {
          headers,
        });
        expect(response.ok()).toBeTruthy();
        expect((await response.json()).code).toBe(0);
      }
    }
  });
});
