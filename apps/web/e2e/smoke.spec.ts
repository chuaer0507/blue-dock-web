import { test, expect } from '@playwright/test';

test.describe('冒烟（无需账号）', () => {
  test('登录页表单可见', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
    await expect(
      page.locator('input[name="password"], input[type="password"]').first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /登录|Sign in|Log in/i })).toBeVisible();
  });

  test('登录页可切换扫码模式', async ({ page }) => {
    await page.goto('/login');
    const qr = page.getByRole('radio', { name: /扫码|QR code/i }).or(
      page.getByText(/^扫码$|^QR code$/i),
    );
    await expect(qr.first()).toBeVisible();
    await qr.first().click();
    await expect(page.getByText(/扫码登录|Scan to sign in|请使用已登录的移动端|mobile app/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('未登录访问 manage 跳转登录并带 redirect', async ({ page }) => {
    await page.goto('/manage/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toMatch(/redirect=/);
    await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  });

  test('Pro 介绍页可见', async ({ page }) => {
    await page.goto('/pro');
    await expect(page.getByRole('heading', { name: /Blue Dock Pro/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole('button', { name: /立即登录|Sign in|进入工作台|Open workspace/i }).first(),
    ).toBeVisible();
  });

  test('预加载页短暂展示后跳转登录', async ({ page }) => {
    await page.goto('/preload');
    await expect(page.getByText(/客户端预加载中|Preparing client/i).first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('隐私政策页可见', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /隐私政策|Privacy Policy/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('iframe[title]')).toBeVisible();
  });
});
