/**
 * k6 load test: GET /reservations のパフォーマンス計測
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
  const res = http.get(`${API_URL}/reservations?resource_id=${resource}&limit=20`);
  check(res, { "status is 200": (r) => r.status === 200 });
}
