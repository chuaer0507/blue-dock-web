import { expect, type Page } from '@playwright/test';

/** 环境变量账号；未配置时返回 null（用例应 skip） */
export function e2eCredentials(): { email: string; password: string; captcha?: string } | null {
  const email = process.env.E2E_EMAIL?.trim();
  const password = process.env.E2E_PASSWORD ?? '';
  if (!email || !password) return null;
  const captcha = process.env.E2E_CAPTCHA?.trim();
  return { email, password, ...(captcha ? { captcha } : {}) };
}

/** 密码登录并等待进入 `/manage` */
export async function loginWithEnv(page: Page): Promise<void> {
  const creds = e2eCredentials();
  if (!creds) {
    throw new Error('E2E_EMAIL / E2E_PASSWORD 未设置');
  }

  await page.goto('/login');
  await page.locator('input[name="email"], input[type="email"]').first().fill(creds.email);
  await page.locator('input[name="password"], input[type="password"]').first().fill(creds.password);

  if (creds.captcha) {
    const captchaInput = page.locator('input[name="captchaCode"]');
    if (await captchaInput.count()) {
      await captchaInput.fill(creds.captcha);
    }
  }

  await page.getByRole('button', { name: /登录|Sign in|Log in/i }).click();
  await expect(page).toHaveURL(/\/manage(\/|$)/, { timeout: 20_000 });
}
