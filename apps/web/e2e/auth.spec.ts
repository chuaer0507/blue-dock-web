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
});
