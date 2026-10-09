import { expect, test } from "@playwright/test"

test("example dataset flows end to end through all four blocks", async ({ page }) => {
  await page.goto("/")
  await page.getByTestId("load-example").click()

  await expect(page.getByTestId("results")).toBeVisible()
  await expect(page.getByTestId("verdict-late")).toContainText("%")
  await expect(page.getByTestId("daypart-chart")).toBeVisible()
  await expect(page.getByTestId("recommendation-table")).toBeVisible()
  await expect(page.getByTestId("before-late")).toContainText("%")
  await expect(page.getByTestId("after-late")).toContainText("%")
  await expect(page.getByTestId("row-report")).toContainText("rows skipped")

  const afterLate = await page.getByTestId("after-late").innerText()
  const beforeLate = await page.getByTestId("before-late").innerText()
  const afterPct = Number(afterLate.match(/(\d+)%/)?.[1])
  const beforePct = Number(beforeLate.match(/(\d+)%/)?.[1])
  expect(beforePct).toBeGreaterThan(afterPct)

  await expect(page.getByTestId("summary-card")).toContainText("offline template")

  const recEvening = await page.getByTestId("rec-evening").innerText()
  expect(recEvening).toMatch(/\d+ min/)
})

test("messy CSV goes through the column mapping flow", async ({ page }) => {
  await page.goto("/")
  await page.setInputFiles('[data-testid="csv-input"]', "e2e/fixtures/messy-columns.csv")

  await expect(page.getByTestId("map-acceptedAt")).toBeVisible()
  await page.getByTestId("map-acceptedAt").selectOption("accept_time")
  await page.getByTestId("map-foodReadyAt").selectOption("ready_ts")
  await page.getByTestId("map-riderArrivedAt").selectOption("courier_in")
  await page.getByTestId("map-pickedUpAt").selectOption("handover")
  await page.getByTestId("map-promisedPrepMin").selectOption("prep_promise")
  await page.getByTestId("mapping-confirm").click()

  await expect(page.getByTestId("results")).toBeVisible()
  await expect(page.getByTestId("row-report")).toContainText("12 orders analyzed")
  await expect(page.getByTestId("row-report")).toContainText("2 rows skipped")
})

test("dark mode toggles and persists across reload", async ({ page }) => {
  await page.goto("/")
  const html = page.locator("html")
  await expect(html).not.toHaveClass(/dark/)

  await page.getByTestId("theme-toggle").click()
  await expect(html).toHaveClass(/dark/)

  await page.reload()
  await expect(html).toHaveClass(/dark/)

  await page.getByTestId("theme-toggle").click()
  await expect(html).not.toHaveClass(/dark/)
})
