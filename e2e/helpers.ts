import { expect, type Page } from "@playwright/test";
import { E2E_PASSCODE } from "./passcode";

export async function resetDemo(page: Page) {
  await page.goto("/login");
  await page.locator("#reset-code").fill(E2E_PASSCODE);
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByText("Demo data has been reset")).toBeVisible();
}

export async function signInAs(page: Page, name: string) {
  await page.goto("/login");
  await page.locator("#passcode").fill(E2E_PASSCODE);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForURL(/\/(portal|admin)/);
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).first().click({ force: true }).catch(async () => {
    await page.getByRole("button", { name: "Sign out" }).last().click();
  });
  await page.waitForURL(/\/login/);
}

export async function openPage(page: Page, label: string | RegExp, heading: string | RegExp) {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label }).click();
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

