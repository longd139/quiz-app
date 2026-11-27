/* global process */
import { test, expect } from '@playwright/test';

const LOCAL_PW = process.env.LOCAL_TEST_PASSWORD || 'QuizLocal2026!';

async function loginThroughUI(page, email, password = LOCAL_PW) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: /Đăng nhập/i }).click();
}

test.describe('Quiz App V2.0 E2E Regression', () => {
  test('Login screen has no public signup and rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Đăng nhập/i })).toBeVisible();
    await expect(page.getByText(/Đăng ký/i)).toHaveCount(0);

    await page.locator('#login-email').fill('usera@quiz.local');
    await page.locator('#login-password').fill('WrongPass123!');
    await page.getByRole('button', { name: /Đăng nhập/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('Disabled account is blocked from logging in', async ({ page }) => {
    await loginThroughUI(page, 'disabled@quiz.local');
    await expect(page.getByRole('alert')).toContainText(/khóa/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('First-login account is forced to /change-password and cannot bypass via URL', async ({ page }) => {
    await loginThroughUI(page, 'firstlogin@quiz.local');
    await expect(page).toHaveURL(/\/change-password/);

    // Attempt direct navigation bypass to /
    await page.goto('/');
    await expect(page).toHaveURL(/\/change-password/);

    await page.goto('/vocab');
    await expect(page).toHaveURL(/\/change-password/);
  });

  test('Regular User can access Quiz, Vocab, History and is blocked from /admin', async ({ page }) => {
    await loginThroughUI(page, 'usera@quiz.local');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Kiểm thử phần mềm \(ISTQB\)/i)).toBeVisible({ timeout: 15_000 });
    await page.getByText(/Kiểm thử phần mềm \(ISTQB\)/i).click();
    await expect(page.getByText(/Đề mẫu ISTQB Foundation/i)).toBeVisible({ timeout: 10_000 });

    // Blocked from /admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);

    // Switch to Language mode (/vocab)
    await page.getByRole('button', { name: /Học Ngôn Ngữ/i }).click();
    await expect(page).toHaveURL(/\/vocab/);
    await expect(page.getByText(/Thuật ngữ Testing Cơ bản/i)).toBeVisible({ timeout: 15_000 });

    // Check History page
    await page.getByRole('button', { name: /Học câu hỏi/i }).click();
    await page.getByRole('button', { name: /Lịch sử/i }).click();
    await expect(page).toHaveURL(/\/history/);
  });

  test('Admin can access /admin dashboard, users, content, audit-logs, backups', async ({ page }) => {
    await loginThroughUI(page, 'admin@quiz.local');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/admin');
    await expect(page.getByText(/Khu vực Quản trị Hệ thống/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Tổng số tài khoản/i)).toBeVisible();

    await page.getByRole('link', { name: /Tài khoản/i }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByText('usera@quiz.local').first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: /Nhật ký Audit/i }).click();
    await expect(page).toHaveURL(/\/admin\/audit-logs/);

    await page.getByRole('link', { name: /Sao lưu/i }).click();
    await expect(page).toHaveURL(/\/admin\/backups/);
  });

  test('Account isolation on logout and login with User B', async ({ page }) => {
    await loginThroughUI(page, 'usera@quiz.local');
    await expect(page).toHaveURL(/\/$/);

    // Logout via account dropdown on desktop or settings modal on mobile
    await page.goto('/data');
    await expect(page.getByText(/Điểm Moosk/i)).toBeVisible({ timeout: 15_000 });

    // Open settings/logout via URL reload or header
    await page.evaluate(() => localStorage.clear());
    await loginThroughUI(page, 'userb@quiz.local');
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/data');
    await expect(page.getByText(/Dữ liệu học tập cá nhân/i)).toBeVisible({ timeout: 15_000 });
  });

  test('BUG-15 & BUG-24: Semester grouping, breadcrumb, quiz practice submit & history persistence', async ({ page }) => {
    await loginThroughUI(page, 'usera@quiz.local');
    await expect(page).toHaveURL(/\/$/);

    // Semester Kỳ 1 -> Subject card -> Quiz set
    await expect(page.getByText('Kỳ 1')).toBeVisible({ timeout: 15_000 });
    await page.getByText(/Kiểm thử phần mềm \(ISTQB\)/i).click();
    await expect(page.getByText('Kho đề thi')).toBeVisible();
    await expect(page.getByText(/Đề mẫu ISTQB Foundation/i)).toBeVisible();

    // Start Practice
    await page.getByRole('button', { name: /Luyện tập/i }).last().click();
    await expect(page).toHaveURL(/\/practice-setup/);
    const startBtn = page.getByRole('button', { name: /Bắt đầu luyện tập/i });
    if (await startBtn.isDisabled()) {
      await page.getByText(/Đề mẫu ISTQB Foundation/i).click();
    }
    await startBtn.click();
    await expect(page).toHaveURL(/\/practice/);

    // Answer Q1 and Q2 then submit
    await page.locator('.opt-btn').first().click();
    await page.getByRole('button', { name: /Sau/i }).click();
    await page.locator('.opt-btn').first().click();
    await page.getByRole('button', { name: /Nộp bài/i }).click();

    await expect(page).toHaveURL(/\/results/, { timeout: 15_000 });
    await page.goto('/history');
    await expect(page.getByText(/Đề mẫu ISTQB Foundation/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('BUG-15 & BUG-16: Failed quiz save keeps user on Practice and succeeds on retry', async ({ page }) => {
    await loginThroughUI(page, 'usera@quiz.local');
    await expect(page).toHaveURL(/\/$/);
    await page.getByText(/Kiểm thử phần mềm \(ISTQB\)/i).click();
    await page.getByRole('button', { name: /Luyện tập/i }).last().click();
    await expect(page).toHaveURL(/\/practice-setup/);
    const startBtn = page.getByRole('button', { name: /Bắt đầu luyện tập/i });
    if (await startBtn.isDisabled()) {
      await page.getByText(/Đề mẫu ISTQB Foundation/i).click();
    }
    await startBtn.click();
    await expect(page).toHaveURL(/\/practice/);

    await page.locator('.opt-btn').first().click();
    await page.getByRole('button', { name: /Sau/i }).click();
    await page.locator('.opt-btn').first().click();

    // Fail the first save RPC call
    let failOnce = true;
    await page.route('**/rest/v1/rpc/apply_learning_progress_event', async (route) => {
      if (failOnce) {
        failOnce = false;
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated DB failure' }) });
        return;
      }
      await route.continue();
    });

    await page.getByRole('button', { name: /Nộp bài/i }).click();
    await expect(page.getByRole('button', { name: /Thử lưu lại/i })).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/practice/);

    // Retry succeeds and navigates to /results
    await page.getByRole('button', { name: /Thử lưu lại/i }).click();
    await expect(page).toHaveURL(/\/results/, { timeout: 15_000 });
  });

  test('BUG-15: Dark mode toggle updates html.dark class', async ({ page }) => {
    await loginThroughUI(page, 'usera@quiz.local');
    await expect(page).toHaveURL(/\/$/);

    const toggleBtn = page.getByRole('button', { name: /Chế độ tối|Chế độ sáng|Dark|Light/i }).first();
    if (await toggleBtn.count()) {
      const beforeDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      await toggleBtn.click();
      const afterDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(afterDark).not.toBe(beforeDark);
    }
  });

  test('SRC E2E: Admin creates LINK package + code, User redeems & views SRC history', async ({ page }) => {
    // 1. Admin creates LINK source package & random access code
    await loginThroughUI(page, 'admin@quiz.local');
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/admin/source-packages');
    await expect(page.getByText(/Quản lý Gói Source Code/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Tạo gói SRC/i }).click();
    await page.locator('form input[type="text"]').first().fill('Quiz App E2E SRC');
    await page.locator('form select').nth(0).selectOption('LINK');
    await page.locator('form select').nth(1).selectOption('ACTIVE');
    await page.locator('form input[type="url"]').fill('https://github.com/longd139/quiz-app');
    await page.getByRole('button', { name: /Lưu gói SRC/i }).click();

    await expect(page.getByText('Quiz App E2E SRC').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Mã truy cập/i }).first().click();
    await page.getByRole('button', { name: /\+ Tạo mã truy cập/i }).click();
    const codeEl = page.getByTestId('revealed-access-code');
    await expect(codeEl).toBeVisible({ timeout: 10_000 });
    const accessCode = (await codeEl.textContent()).trim();
    expect(accessCode.length).toBeGreaterThanOrEqual(12);

    // 2. Real logout & login as User A
    await page.evaluate(() => localStorage.clear());
    await loginThroughUI(page, 'usera@quiz.local');
    await expect(page).toHaveURL(/\/$/);

    // 3. Click Nhận SRC -> test wrong code -> test valid code
    await page.getByRole('button', { name: /Nhận SRC/i }).click();
    await expect(page.getByRole('heading', { name: /Nhận Source Code/i })).toBeVisible();

    await page.locator('#src-access-code').fill('WrongCode999');
    await page.getByRole('button', { name: /Xác nhận mã/i }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });

    await page.locator('#src-access-code').fill(accessCode);
    await page.getByRole('button', { name: /Xác nhận mã/i }).click();
    await expect(page.getByText(/Xác nhận mã thành công/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Quiz App E2E SRC')).toBeVisible();
    await expect(page.getByRole('link', { name: /Mở Source Code/i })).toBeVisible();
    await page.getByRole('button', { name: 'Đóng' }).last().click();

    // 4. Verify SRC history in /data
    await page.goto('/data');
    await expect(page.getByText(/SRC đã nhận/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Quiz App E2E SRC').first()).toBeVisible({ timeout: 10_000 });
  });
});
