import { test, expect } from "@playwright/test";

import { mockEngine } from "../support/harness";

test.describe("Providers page smoke", () => {
  test("renders the fixture providers with their regions", async ({ page }) => {
    await mockEngine(page);
    await page.goto("/providers");

    await expect(page.getByText("OCI Demo")).toBeVisible();
    await expect(page.getByText("Proxmox Demo")).toBeVisible();
    await expect(page.getByText("us-ashburn-1")).toBeVisible();
  });
});
