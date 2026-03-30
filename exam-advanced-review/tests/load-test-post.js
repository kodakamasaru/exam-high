/**
 * k6 load test: POST /reservations のパフォーマンス計測
 * 排他制御の方式による速度差が出る
 */

import http from "k6/http";
import { check } from "k6";

const API_URL = __ENV.API_URL || "http://localhost:3000/api";
const RESOURCES = ["room-a", "room-b", "room-c"];

export const options = {
  stages: [
    { duration: "10s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "10s", target: 0 },
  ],
};

export default function () {
  const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
  const year = 2040 + Math.floor(Math.random() * 10);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  const hour = Math.floor(Math.random() * 24);
  const minute = Math.floor(Math.random() * 60);
  const durationMin = 30 + Math.floor(Math.random() * 90);

  const start = new Date(year, parseInt(month) - 1, parseInt(day), hour, minute);
  const end = new Date(start.getTime() + durationMin * 60 * 1000);

  function fmt(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:00`;
  }

  const res = http.post(
    `${API_URL}/reservations`,
    JSON.stringify({
      resource_id: resource,
      event_name: `load-post-${__VU}-${__ITER}`,
      start: fmt(start),
      end: fmt(end),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(res, { "status 201 or 409": (r) => r.status === 201 || r.status === 409 });
}
