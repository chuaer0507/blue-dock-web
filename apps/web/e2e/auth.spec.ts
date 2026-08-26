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
    const backendBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080';
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
      projectId = projectResult.data?.id ?? null;
      expect(typeof projectId).toBe('string');
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
      taskId = taskResult.data?.id ?? null;
      expect(typeof taskId).toBe('string');
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
        await page.request
          .get(`${backendBaseUrl}/api/project/task/remove?taskId=${taskId}`, {
            headers,
            timeout: 3000,
          })
          .catch(() => undefined);
      }
      if (projectId) {
        await page.request
          .get(`${backendBaseUrl}/api/project/remove?projectId=${projectId}`, {
            headers,
            timeout: 3000,
          })
          .catch(() => undefined);
      }
    }
  });

  test('日历可显示当天任务并切换月周日视图', async ({ page }) => {
    await loginWithEnv(page);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const backendBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080';
    const projectName = `E2E 日历项目 ${Date.now()}`;
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const taskName = `E2E 日历任务 ${Date.now()}`;
    let projectId: string | null = null;
    let taskId: string | null = null;

    try {
      const projectResponse = await page.request.get(
        `/api/project/add?name=${encodeURIComponent(projectName)}`,
        { headers },
      );
      const projectResult = await projectResponse.json();
      expect(projectResult.code).toBe(0);
      projectId = projectResult.data?.id ?? null;
      expect(typeof projectId).toBe('string');

      const taskResponse = await page.request.post(
        `/api/project/task/add?projectId=${projectId}&name=${encodeURIComponent(taskName)}&startAt=${date}%2009%3A00%3A00&endAt=${date}%2010%3A00%3A00`,
        { headers },
      );
      const taskResult = await taskResponse.json();
      expect(taskResult.code).toBe(0);
      taskId = taskResult.data?.id ?? null;
      expect(typeof taskId).toBe('string');

      await page.goto('/manage/calendar');
      await expect(page.getByRole('heading', { name: /日历|Calendar/i })).toBeVisible();
      await expect(page.getByLabel(taskName)).toBeVisible();
      await page.getByLabel(taskName).click();
      await expect(page.locator('input[name="name"]')).toHaveValue(taskName);
      await page.keyboard.press('Escape');

      await page.getByText(/^(周|Week)$/i).click();
      await expect(page.getByText(/全天任务|All-day/i).first()).toBeVisible();
      await page.getByText(/^(日|Day)$/i).click();
      await expect(page.getByRole('radio', { name: /日|Day/i })).toBeChecked();
    } finally {
      if (taskId) {
        await page.request
          .get(`${backendBaseUrl}/api/project/task/remove?taskId=${taskId}`, {
            headers,
            timeout: 3000,
          })
          .catch(() => undefined);
      }
      if (projectId) {
        await page.request
          .get(`${backendBaseUrl}/api/project/remove?projectId=${projectId}`, {
            headers,
            timeout: 3000,
          })
          .catch(() => undefined);
      }
    }
  });

  test('应用中心可打开快建任务与系统路由卡片', async ({ page }) => {
    await loginWithEnv(page);
    await page.goto('/manage/application');
    await expect(page.getByRole('heading', { name: /应用|Apps/i })).toBeVisible();

    await page.getByRole('button', { name: /添加任务|新建任务|Add task|New task/i }).click();
    await expect(page.getByRole('heading', { name: /快速创建任务|Quick create task/i })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /工作报告|Work reports/i }).click();
    await expect(page).toHaveURL(/\/manage\/report/);
  });

  test('文件可新建目录并使用字符串 ID 打开目录', async ({ page }) => {
    await loginWithEnv(page);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const backendBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080';
    const folderName = `E2E 文件目录 ${Date.now()}`;
    let folderId: string | null = null;

    try {
      await page.goto('/manage/file');
      await page.getByRole('button', { name: /新建文件夹|New folder/i }).click();
      await page.locator('input[name="folderName"]').fill(folderName);
      await page.getByRole('button', { name: /创建|Create/i }).click();
      await expect(page.getByText(folderName)).toBeVisible();

      await page.getByText(folderName).first().click();
      await expect(page).toHaveURL(/\/manage\/file\/\d+/);
      const match = /\/manage\/file\/(\d+)/.exec(page.url());
      folderId = match?.[1] ?? null;
      expect(typeof folderId).toBe('string');
    } finally {
      if (folderId) {
        await page.request
          .get(`${backendBaseUrl}/api/file/remove?id=${folderId}`, { headers, timeout: 3000 })
          .catch(() => undefined);
      }
    }
  });

  test('AI 多会话的消息彼此隔离', async ({ page }) => {
    await loginWithEnv(page);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const botsResponse = await page.request.get('/api/users/search/ai?take=1', { headers });
    const bots = await botsResponse.json();
    const botUserId = bots.data?.list?.[0]?.userId;
    expect(typeof botUserId).toBe('string');

    const dialogResponse = await page.request.get(`/api/dialog/open/user?userId=${botUserId}`, {
      headers,
    });
    const dialog = await dialogResponse.json();
    const dialogId = dialog.data?.id;
    expect(typeof dialogId).toBe('string');

    const sessionAResponse = await page.request.get(
      `/api/dialog/session/create?dialogId=${dialogId}&title=${encodeURIComponent('E2E session A')}`,
      { headers },
    );
    const sessionA = await sessionAResponse.json();
    expect(sessionA.code).toBe(0);
    const messageA = `E2E 会话 A ${Date.now()}`;
    const sentAResponse = await page.request.post(
      `/api/dialog/message/sendAiAssistant?dialogId=${dialogId}&text=${encodeURIComponent(messageA)}`,
      { headers },
    );
    expect((await sentAResponse.json()).code).toBe(0);
    const listAResponse = await page.request.get(`/api/dialog/message/list?dialogId=${dialogId}`, {
      headers,
    });
    expect((await listAResponse.json()).data.map((item: { body: string }) => item.body).join('\n')).toContain(
      messageA,
    );

    const sessionBResponse = await page.request.get(
      `/api/dialog/session/create?dialogId=${dialogId}&title=${encodeURIComponent('E2E session B')}`,
      { headers },
    );
    const sessionB = await sessionBResponse.json();
    expect(sessionB.code).toBe(0);
    const listBResponse = await page.request.get(`/api/dialog/message/list?dialogId=${dialogId}`, {
      headers,
    });
    expect((await listBResponse.json()).data.map((item: { body: string }) => item.body).join('\n')).not.toContain(
      messageA,
    );

    const messageB = `E2E 会话 B ${Date.now()}`;
    const sentBResponse = await page.request.post(
      `/api/dialog/message/sendAiAssistant?dialogId=${dialogId}&text=${encodeURIComponent(messageB)}`,
      { headers },
    );
    expect((await sentBResponse.json()).code).toBe(0);
    const reopenAResponse = await page.request.get(
      `/api/dialog/session/open?dialogId=${dialogId}&sessionId=${sessionA.data.sessionId}`,
      { headers },
    );
    expect((await reopenAResponse.json()).code).toBe(0);
    const reopenedListResponse = await page.request.get(
      `/api/dialog/message/list?dialogId=${dialogId}`,
      { headers },
    );
    const reopenedBodies = (await reopenedListResponse.json()).data
      .map((item: { body: string }) => item.body)
      .join('\n');
    expect(reopenedBodies).toContain(messageA);
    expect(reopenedBodies).not.toContain(messageB);
  });

  test('全局搜索保留 q 深链并可打开项目结果', async ({ page }) => {
    await loginWithEnv(page);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const backendBaseUrl = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080';
    const projectName = `E2E 搜索项目 ${Date.now()}`;
    let projectId: string | null = null;

    try {
      const projectResponse = await page.request.get(
        `/api/project/add?name=${encodeURIComponent(projectName)}`,
        { headers },
      );
      const project = await projectResponse.json();
      expect(project.code).toBe(0);
      projectId = project.data?.id ?? null;
      expect(typeof projectId).toBe('string');

      await page.goto(`/manage/search?q=${encodeURIComponent(projectName)}`);
      await expect(page.locator('input[name="global-search"]')).toHaveValue(projectName);
      await expect(page.getByRole('button', { name: new RegExp(projectName) })).toBeVisible({
        timeout: 15_000,
      });
      await page.getByRole('button', { name: new RegExp(projectName) }).click();
      await expect(page).toHaveURL(new RegExp(`/manage/project/${projectId}`));
    } finally {
      if (projectId) {
        await page.request
          .get(`${backendBaseUrl}/api/project/remove?projectId=${projectId}`, {
            headers,
            timeout: 3000,
          })
          .catch(() => undefined);
      }
    }
  });

  test('会议大厅可创建并进入会议房间', async ({ page }) => {
    await loginWithEnv(page);
    const meetingName = `E2E 会议 ${Date.now()}`;
    await page.goto('/meeting');
    await page.locator('input[name="name"]').fill(meetingName);
    await page.getByRole('button', { name: /创建会议|Create meeting/i }).click();
    await expect(page).toHaveURL(/\/meeting\/[^/]+/);
    await expect(page.getByRole('heading', { name: meetingName })).toBeVisible();
    await expect(page.getByText(/会议 ID|Meeting ID/i)).toBeVisible();
  });
});
