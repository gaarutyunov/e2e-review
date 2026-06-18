import { createBdd } from 'playwright-bdd';
import { test, expect } from '../fixtures';

const { Given, When, Then } = createBdd(test);

Given('the login page is open', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByTestId('login-card')).toBeVisible();
});

// --- Login fields (the login page) ---
When('I enter the email {string}', async ({ page }, email: string) => {
  await page.getByTestId('email').fill(email);
});

When('I enter the password {string}', async ({ page }, password: string) => {
  await page.getByTestId('password').fill(password);
});

When('I click the sign in button', async ({ page }) => {
  await page.getByTestId('login-submit').click();
});

// --- Reset password ---
When('I click the forgot password link', async ({ page }) => {
  await page.getByTestId('forgot-password-link').click();
  await expect(page.getByTestId('reset-card')).toBeVisible();
});

When('I request a password reset for {string}', async ({ page }, email: string) => {
  await page.getByTestId('reset-email').fill(email);
  await page.getByTestId('reset-continue').click();
});

When('I set the new password to {string}', async ({ page }, password: string) => {
  await page.getByTestId('new-password').fill(password);
  await page.getByTestId('confirm-password').fill(password);
  await page.getByTestId('reset-submit').click();
});

When('I go back to sign in', async ({ page }) => {
  await page.getByTestId('back-to-login').click();
  await expect(page.getByTestId('login-card')).toBeVisible();
});

// --- Register ---
When('I click the register link', async ({ page }) => {
  await page.getByTestId('register-link').click();
  await expect(page.getByTestId('register-card')).toBeVisible();
});

When(
  'I register with name {string}, organization {string}, email {string} and password {string}',
  async ({ page }, name: string, organization: string, email: string, password: string) => {
    await page.getByTestId('name').fill(name);
    await page.getByTestId('organization').fill(organization);
    await page.getByTestId('reg-email').fill(email);
    await page.getByTestId('reg-password').fill(password);
    await page.getByTestId('register-submit').click();
  }
);

// --- Assertions ---
Then('I should see the dashboard', async ({ page }) => {
  await expect(page.getByTestId('dashboard')).toBeVisible();
});

Then('I should see my name {string}', async ({ page }, name: string) => {
  await expect(page.getByTestId('profile-name')).toHaveText(name);
});

Then('I should see the error {string}', async ({ page }, message: string) => {
  await expect(page.getByTestId('login-error')).toContainText(message);
});

Then('I should see the reset success message', async ({ page }) => {
  await expect(page.getByTestId('reset-success')).toBeVisible();
});
