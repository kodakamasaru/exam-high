/**
 * k6 load test: GET /reservations のパフォーマンスを計測する。
 *
 * Usage: k6 run --out json=reports/perf.json load-test.js
 */

import http from "k6/http";
import { check } from "k6";

const API_URL = __ENV.API_URL || "http://localhost:3000/api";

const RESOURCES = ["room-a", "room-b", "room-c"];

export const options = {
  stages: [
    { duration: "10s", target: 50 },   // ramp up
    { duration: "30s", target: 100 },   // sustained load
    { duration: "10s", target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // p95 < 2秒（記録用、failでもスコアに反映）
  },
};

export default function () {
  const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
  const res = http.get(`${API_URL}/reservations?resource_id=${resource}&limit=20`);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });
}
