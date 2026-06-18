/**
 * Mock authentication for the demo app. Entirely in-memory / client-side —
 * there is no real backend. One seeded account exists; registration and
 * password reset mutate the in-memory store for the lifetime of the page.
 */

export interface Account {
  email: string;
  password: string;
  name: string;
  organization?: string;
}

const accounts = new Map<string, Account>();

// Seeded valid credentials used by the "successful login" scenario.
accounts.set('user@acme.test', {
  email: 'user@acme.test',
  password: 'Password123!',
  name: 'Ada Lovelace',
});

export function login(email: string, password: string): Account | null {
  const acc = accounts.get(email.trim().toLowerCase());
  if (acc && acc.password === password) return acc;
  return null;
}

export function register(input: Account): Account {
  const email = input.email.trim().toLowerCase();
  const account: Account = { ...input, email };
  accounts.set(email, account);
  return account;
}

export function accountExists(email: string): boolean {
  return accounts.has(email.trim().toLowerCase());
}

export function resetPassword(email: string, newPassword: string): boolean {
  const acc = accounts.get(email.trim().toLowerCase());
  if (!acc) return false;
  acc.password = newPassword;
  return true;
}
