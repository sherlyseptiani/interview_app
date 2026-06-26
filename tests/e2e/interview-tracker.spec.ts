import { expect, test } from "@playwright/test";

import { THEME_STORAGE_KEY } from "../../lib/theme";

function monthLabel(monthOffset: number): string {
  const today = new Date();
  const month = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  return month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((themeStorageKey) => {
    window.localStorage.setItem(themeStorageKey, "dark");
  }, THEME_STORAGE_KEY);
});

test("renders the tracker and exercises core daily controls", async ({ page }) => {
  // Given
  await page.goto("/");

  // When
  await page.getByLabel(/Day 1 - Checklist item 1:/).check();
  await page.getByLabel("Daily notes").fill("Review map invariants");
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.getByRole("button", { name: "Pause timer" }).click();
  await page.getByRole("button", { name: "+5 min" }).click();

  // Then
  await expect(page.getByRole("heading", { name: "Sherly's Technical Interview Sprint" })).toBeVisible();
  await expect(page.getByLabel("Program start date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
  await expect(page.getByLabel("Progress summary")).toContainText("Completed");
  await expect(page.getByLabel(/Day 1 - Checklist item 1:/)).toBeChecked();
  await expect(page.getByText("5 / 60 min")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("minutes added");

  // When / Then
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("shows one current-month calendar and navigates by month", async ({ page }) => {
  // Given
  const currentMonth = monthLabel(0);
  const nextMonth = monthLabel(1);
  await page.goto("/");

  // When / Then
  await expect(page.locator(".month")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: currentMonth })).toBeVisible();
  await expect(page.locator(".calendar-legend")).toHaveCount(0);
  await expect(page.locator(".cal-cat")).toHaveCount(0);
  await expect(page.locator(".cal-task")).toHaveCount(0);
  await expect(page.locator(".cal-day.today")).toHaveCount(0);
  await expect(page.locator(".cal-day.selected")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Previous month/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Next month/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Show current month/ })).toBeVisible();

  // When
  await page.getByRole("button", { name: /Next month/ }).click();

  // Then
  await expect(page.locator(".month")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: nextMonth })).toBeVisible();

  // When
  await page.getByRole("button", { name: /Previous month/ }).click();

  // Then
  await expect(page.getByRole("heading", { name: currentMonth })).toBeVisible();

  // When
  await page.getByRole("button", { name: /Next month/ }).click();
  await page.getByRole("button", { name: /Show current month/ }).click();

  // Then
  await expect(page.getByRole("heading", { name: currentMonth })).toBeVisible();
});

test("formats daily notes with the toolbar", async ({ page }) => {
  // Given
  await page.goto("/");
  const notes = page.getByLabel("Daily notes");
  const preview = page.getByLabel("Formatted notes preview");

  // When
  await notes.fill("Review map invariants");
  await notes.selectText();
  await page.getByRole("button", { name: "Bold" }).click();

  // Then
  await expect(notes).toHaveValue("**Review map invariants**");
  await expect(preview.locator("strong")).toHaveText("Review map invariants");

  // When
  await notes.fill("Key takeaway");
  await notes.selectText();
  await page.getByRole("button", { name: "Heading" }).click();

  // Then
  await expect(notes).toHaveValue("# Key takeaway");
  await expect(preview.locator("h4")).toHaveText("Key takeaway");

  // When
  await notes.fill("capture edge cases\ncompare tradeoffs");
  await notes.selectText();
  await page.getByRole("button", { name: "Bullets" }).click();

  // Then
  await expect(notes).toHaveValue("- capture edge cases\n- compare tradeoffs");
  await expect(preview.locator("ul li")).toHaveText(["capture edge cases", "compare tradeoffs"]);

  // When
  await notes.fill("state approach\nexplain complexity");
  await notes.selectText();
  await page.getByRole("button", { name: "Numbers" }).click();

  // Then
  await expect(notes).toHaveValue("1. state approach\n2. explain complexity");
  await expect(preview.locator("ol li")).toHaveText(["state approach", "explain complexity"]);
});

test("keeps resource links hidden for tasks without resources", async ({ page }) => {
  // Given
  await page.goto("/");

  // When
  await page.getByRole("button", { name: /7 Run a baseline technical mock/ }).click();

  // Then
  await expect(page.getByRole("heading", { name: "Related learning links" })).toBeHidden();
});
