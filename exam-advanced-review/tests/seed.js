/**
 * k6 seed script: POST /reservations を大量実行してデータを投入する。
 *
 * Usage: k6 run seed.js
 */

import http from "k6/http";

const API_URL = __ENV.API_URL || "http://localhost:3000/api";
const TOTAL_REQUESTS = parseInt(__ENV.SEED_COUNT || "100000", 10);

const RESOURCES = ["room-a", "room-b", "room-c"];

// 2020年〜2030年の範囲でランダムな日時を生成（過去データもOK、GET時にfrom指定で絞る）
function randomDateTime() {
  const year = 2020 + Math.floor(Math.random() * 10);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  const hour = Math.floor(Math.random() * 22);
  const start = `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:00:00`;
  const end = `${year}-${month}-${day}T${String(hour + 1).padStart(2, "0")}:00:00`;
  return { start, end };
}

export const options = {
  vus: 50,
  iterations: TOTAL_REQUESTS,
  thresholds: {},
};

export default function () {
  const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
  const { start, end } = randomDateTime();

  http.post(
    `${API_URL}/reservations`,
    JSON.stringify({
      resource_id: resource,
      event_name: `seed-${__VU}-${__ITER}`,
      start,
      end,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
