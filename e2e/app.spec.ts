import { expect, test } from "@playwright/test"

test("example dataset flows end to end through all four blocks", async ({ page }) => {
  await page.goto("/")
  await page.getByTestId("load-example").click()
  await page.getByTestId("sample-grid").waitFor()
  await page.getByTestId("sample-card-kreuzberg-kanteen").click()

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

  const summaryBadge = await page.getByTestId("summary-card").innerText()
  expect(summaryBadge).toMatch(/drafted by AI|template — straight from the engine numbers/)

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

test("messy sample restaurant goes through the column mapping flow", async ({ page }) => {
  await page.goto("/")
  await page.getByTestId("load-example").click()
  await page.getByTestId("sample-card-prenzlauer-bio-brunch").click()

  await expect(page.getByTestId("map-acceptedAt")).toBeVisible()
  await page.getByTestId("map-acceptedAt").selectOption("annahme_zeit")
  await page.getByTestId("map-foodReadyAt").selectOption("fertig_um")
  await page.getByTestId("map-riderArrivedAt").selectOption("kurir_da")
  await page.getByTestId("map-pickedUpAt").selectOption("kurir_weg")
  await page.getByTestId("map-promisedPrepMin").selectOption("zusage_min")
  await page.getByTestId("mapping-confirm").click()

  await expect(page.getByTestId("results")).toBeVisible()
  await expect(page.getByTestId("row-report")).toContainText("364 orders analyzed")
})

test("sample data panel: view, download, edit, reset — session only", async ({ page }) => {
  await page.goto("/")
  await page.getByTestId("load-example").click()
  await page.getByTestId("sample-card-kreuzberg-kanteen").click()
  await expect(page.getByTestId("results")).toBeVisible()

  await page.getByTestId("data-panel-toggle").click()
  const editor = page.getByTestId("data-editor")
  await expect(editor).toContainText("order_id,accepted_at")

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("data-download").click(),
  ])
  expect(download.suggestedFilename()).toBe("kreuzberg-kanteen.csv")

  const editedCsv = [
    "order_id,accepted_at,food_ready_at,rider_arrived_at,picked_up_at,promised_prep_min",
    "A,2026-09-01T12:00:00,2026-09-01T12:20:00,2026-09-01T12:25:00,2026-09-01T12:30:00,15",
    "B,2026-09-01T12:30:00,2026-09-01T12:45:00,2026-09-01T12:50:00,2026-09-01T13:00:00,15",
    "C,,,,,,,,,",
  ].join("\n")
  await editor.fill(editedCsv)
  await page.getByTestId("data-apply").click()

  await expect(page.getByTestId("row-report")).toContainText("2 orders analyzed")
  await expect(page.getByTestId("row-report")).toContainText("1 rows skipped")
  await expect(page.getByTestId("data-panel")).toContainText("edited — this session only")

  await page.getByTestId("data-reset").click()
  await expect(page.getByTestId("row-report")).toContainText("747 orders analyzed")
  await expect(page.getByTestId("data-panel")).not.toContainText("edited — this session only")

  await page.reload()
  await expect(page.getByTestId("results")).not.toBeVisible()
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

test("logo click returns to the landing page from any view", async ({ page }) => {
  await page.goto("/")
  await page.getByTestId("load-example").click()
  await page.getByTestId("sample-card-kreuzberg-kanteen").click()
  await expect(page.getByTestId("results")).toBeVisible()

  await page.getByTestId("logo-home").click()
  await expect(page.getByTestId("results")).not.toBeVisible()
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "The prep-time numbers your kitchen actually runs on.",
  )

  await page.goto("/#/qa")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Q&A")

  await page.getByTestId("logo-home").click()
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "The prep-time numbers your kitchen actually runs on.",
  )
})
