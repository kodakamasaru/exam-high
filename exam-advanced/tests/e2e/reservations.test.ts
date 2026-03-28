import { test, expect } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3000/api";

function futureDateTime(daysFromNow: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:00:00`;
}

function toInputValue(datetime: string): string {
  // "2030-01-15T10:00:00" → "2030-01-15T10:00"
  return datetime.slice(0, 16);
}

test.describe("ナビゲーション", () => {
  test("予約登録リンクが存在し遷移できる", async ({ page }) => {
    await page.goto("/reservations");
    const link = page.getByTestId("nav-new");
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/reservations\/new/);
  });

  test("予約一覧リンクが存在し遷移できる", async ({ page }) => {
    await page.goto("/reservations/new");
    const link = page.getByTestId("nav-list");
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/reservations(\?|$)/);
  });
});

test.describe("予約登録画面", () => {
  test("必要なdata-testidが存在する", async ({ page }) => {
    await page.goto("/reservations/new");
    await expect(page.getByTestId("resource-id-room-a")).toBeVisible();
    await expect(page.getByTestId("resource-id-room-b")).toBeVisible();
    await expect(page.getByTestId("resource-id-room-c")).toBeVisible();
    await expect(page.getByTestId("event-name-input")).toBeVisible();
    await expect(page.getByTestId("start-input")).toBeVisible();
    await expect(page.getByTestId("end-input")).toBeVisible();
    await expect(page.getByTestId("submit-button")).toBeVisible();
  });

  test("予約を登録すると成功メッセージが表示される", async ({ page }) => {
    await page.goto("/reservations/new");

    await page.getByTestId("resource-id-room-a").click();
    await page.getByTestId("event-name-input").fill("E2Eテスト予約");
    await page.getByTestId("start-input").fill(toInputValue(futureDateTime(30, 10)));
    await page.getByTestId("end-input").fill(toInputValue(futureDateTime(30, 11)));
    await page.getByTestId("submit-button").click();

    await expect(page.getByTestId("success-message")).toBeVisible({ timeout: 5000 });
  });

  test("重複する予約を登録するとエラーメッセージが表示される", async ({ page }) => {
    const start = futureDateTime(31, 10);
    const end = futureDateTime(31, 11);

    // APIで先に予約を作成
    await fetch(`${API_URL}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_id: "room-a",
        event_name: "先約",
        start,
        end,
      }),
    });

    // フォームから同じ時間帯で登録を試みる
    await page.goto("/reservations/new");
    await page.getByTestId("resource-id-room-a").click();
    await page.getByTestId("event-name-input").fill("重複テスト");
    await page.getByTestId("start-input").fill(toInputValue(start));
    await page.getByTestId("end-input").fill(toInputValue(end));
    await page.getByTestId("submit-button").click();

    await expect(page.getByTestId("error-message")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("予約一覧画面", () => {
  test("必要なdata-testidが存在する", async ({ page }) => {
    await page.goto("/reservations?resource_id=room-a");
    await expect(page.getByTestId("filter-room-a")).toBeVisible();
    await expect(page.getByTestId("filter-room-b")).toBeVisible();
    await expect(page.getByTestId("filter-room-c")).toBeVisible();
    await expect(page.getByTestId("filter-button")).toBeVisible();
    await expect(page.getByTestId("reservation-list")).toBeVisible();
    await expect(page.getByTestId("prev-page")).toBeVisible();
    await expect(page.getByTestId("next-page")).toBeVisible();
  });

  test("APIで登録した予約が一覧に表示される", async ({ page }) => {
    const start = futureDateTime(32, 10);
    const end = futureDateTime(32, 11);

    // APIで予約作成
    await fetch(`${API_URL}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_id: "room-b",
        event_name: "一覧表示テスト",
        start,
        end,
      }),
    });

    await page.goto("/reservations?resource_id=room-b");
    await expect(page.getByTestId("reservation-item").first()).toBeVisible({ timeout: 5000 });
  });

  test("フィルタで検索できる", async ({ page }) => {
    await page.goto("/reservations?resource_id=room-a");
    await page.getByTestId("filter-room-b").click();
    await page.getByTestId("filter-button").click();

    await expect(page).toHaveURL(/resource_id=room-b/);
  });
});
