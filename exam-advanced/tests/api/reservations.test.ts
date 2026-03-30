import { describe, it, expect } from "vitest";

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

async function createReservation(body: Record<string, unknown>) {
  return fetch(`${API_URL}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /reservations", () => {
  it("予約を登録できる", async () => {
    const res = await createReservation({
      resource_id: "room-a",
      event_name: "テスト予約",
      start: futureDateTime(10, 10),
      end: futureDateTime(10, 11),
    });

    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.resource_id).toBe("room-a");
    expect(body.event_name).toBe("テスト予約");
    expect(body.start).toBeDefined();
    expect(body.end).toBeDefined();
    expect(body.created_at).toBeDefined();
  });

  it("同一リソース・同一時間帯の重複は409", async () => {
    const start = futureDateTime(11, 14);
    const end = futureDateTime(11, 15);

    const res1 = await createReservation({
      resource_id: "room-b",
      event_name: "先約",
      start,
      end,
    });
    expect(res1.status).toBe(201);

    const res2 = await createReservation({
      resource_id: "room-b",
      event_name: "重複予約",
      start,
      end,
    });
    expect(res2.status).toBe(409);

    const body = await res2.json();
    expect(body.error).toBe("slot_conflict");
  });

  it("時間が部分的に重複しても409", async () => {
    const res1 = await createReservation({
      resource_id: "room-c",
      event_name: "先約",
      start: futureDateTime(12, 10),
      end: futureDateTime(12, 12),
    });
    expect(res1.status).toBe(201);

    const res2 = await createReservation({
      resource_id: "room-c",
      event_name: "部分重複",
      start: futureDateTime(12, 11),
      end: futureDateTime(12, 13),
    });
    expect(res2.status).toBe(409);
  });

  it("別リソースなら同時間帯でも登録できる", async () => {
    const start = futureDateTime(13, 10);
    const end = futureDateTime(13, 11);

    const res1 = await createReservation({
      resource_id: "room-a",
      event_name: "room-aの予約",
      start,
      end,
    });
    expect(res1.status).toBe(201);

    const res2 = await createReservation({
      resource_id: "room-b",
      event_name: "room-bの予約",
      start,
      end,
    });
    expect(res2.status).toBe(201);
  });

  it("過去の日時だと400", async () => {
    const res = await createReservation({
      resource_id: "room-a",
      event_name: "過去の予約",
      start: "2020-01-01T10:00:00",
      end: "2020-01-01T11:00:00",
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("validation_error");
  });

  it("endがstartと同じだと400", async () => {
    const sameTime = futureDateTime(14, 10);
    const res = await createReservation({
      resource_id: "room-a",
      event_name: "開始と終了が同じ",
      start: sameTime,
      end: sameTime,
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("validation_error");
  });

  it("endがstartより前だと400", async () => {
    const res = await createReservation({
      resource_id: "room-a",
      event_name: "不正な時間",
      start: futureDateTime(14, 12),
      end: futureDateTime(14, 10),
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("validation_error");
  });

  it("必須フィールドが欠けていると400", async () => {
    const res = await createReservation({
      resource_id: "room-a",
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("validation_error");
  });

  it("無効なresource_idだと400", async () => {
    const res = await createReservation({
      resource_id: "room-z",
      event_name: "存在しないリソース",
      start: futureDateTime(15, 10),
      end: futureDateTime(15, 11),
    });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("validation_error");
  });
});

describe("GET /reservations", () => {
  it("resource_id指定で一覧取得できる", async () => {
    // まず予約を作る
    await createReservation({
      resource_id: "room-a",
      event_name: "一覧テスト用",
      start: futureDateTime(20, 10),
      end: futureDateTime(20, 11),
    });

    const res = await fetch(
      `${API_URL}/reservations?resource_id=room-a`
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBeDefined();
    expect(body.pagination.limit).toBeDefined();
    expect(body.pagination.total).toBeDefined();
  });

  it("start昇順でソートされている", async () => {
    // 遅い時間 → 早い時間の順に作成
    await createReservation({
      resource_id: "room-c",
      event_name: "ソートテスト後",
      start: futureDateTime(21, 15),
      end: futureDateTime(21, 16),
    });
    await createReservation({
      resource_id: "room-c",
      event_name: "ソートテスト前",
      start: futureDateTime(21, 10),
      end: futureDateTime(21, 11),
    });

    const res = await fetch(
      `${API_URL}/reservations?resource_id=room-c&from=${futureDateTime(21, 0)}&to=${futureDateTime(22, 0)}`
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(2);

    for (let i = 1; i < body.data.length; i++) {
      expect(body.data[i].start >= body.data[i - 1].start).toBe(true);
    }
  });

  it("resource_idが未指定だと400", async () => {
    const res = await fetch(`${API_URL}/reservations`);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("validation_error");
  });

  it("ページネーションが動作する", async () => {
    const res = await fetch(
      `${API_URL}/reservations?resource_id=room-a&page=1&limit=1`
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.length).toBeLessThanOrEqual(1);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(1);
  });
});
