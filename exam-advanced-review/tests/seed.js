/**
 * k6 seed script: POST /reservations を大量実行してデータを投入する。
 * リソース・開始時間・長さ（30分〜24時間）をランダム化し、衝突率を下げる。
 *
 * Usage: k6 run seed.js
 */

import http from "k6/http";

const API_URL = __ENV.API_URL || "http://localhost:3000/api";
const TOTAL_REQUESTS = parseInt(__ENV.SEED_COUNT || "100000", 10);

const RESOURCES = ["room-a", "room-b", "room-c"];

// 30分〜24時間の範囲でランダムな長さ（分単位）
function randomDurationMinutes() {
  return 30 + Math.floor(Math.random() * (24 * 60 - 30)); // 30〜1440分
}

function randomDateTime() {
  // 未来日時のみ（2030〜2039年）。過去日時はPOSTバリデーションで弾かれるため
  const year = 2030 + Math.floor(Math.random() * 10);
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);

  const startDate = new Date(year, month - 1, day, hour, minute);
  const durationMin = randomDurationMinutes();
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);

  function fmt(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
  }

  return { start: fmt(startDate), end: fmt(endDate) };
}

export const options = {
  vus: 50,
  iterations: TOTAL_REQUESTS,
  thresholds: {},
  noConnectionReuse: false,
  // タイムアウト無制限（EXCLUDE制約等で遅い実装でも確実に投入）
  duration: "30m",
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
