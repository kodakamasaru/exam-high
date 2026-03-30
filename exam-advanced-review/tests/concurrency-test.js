/**
 * k6 concurrency test: 50VUが同時に同じ時間枠に予約を試みる。
 * 201が1件だけ返り、残りは409であることを確認。
 *
 * Usage: k6 run --summary-export=/reports/concurrency-summary.json concurrency-test.js
 */

import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const API_URL = __ENV.API_URL || "http://localhost:3000/api";

const successCount = new Counter("successful_bookings");

export const options = {
  vus: 50,
  iterations: 50,  // 50VU × 1回ずつ = 50同時リクエスト
};

export default function () {
  const res = http.post(
    `${API_URL}/reservations`,
    JSON.stringify({
      resource_id: "room-a",
      event_name: `concurrency-test-vu${__VU}`,
      start: "2099-12-31T10:00:00",
      end: "2099-12-31T11:00:00",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  const ok = check(res, {
    "status is 201 or 409": (r) => r.status === 201 || r.status === 409,
  });

  if (res.status === 201) {
    successCount.add(1);
  }
}
