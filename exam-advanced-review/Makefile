SUBMISSION_DIR ?= submission
REPORTS_DIR = reports

.PHONY: all e2e-test seed score-all arch-test type-check lint duplication-check security-test load-test frontend-lint lighthouse bundle-size

all: e2e-test seed score-all

## 足切り
e2e-test:
	@echo "=== E2E Test (pass/fail) ==="
	# TODO: Playwright実行

## シードデータ投入
seed:
	@echo "=== Seeding data via POST /reservations (~1M records) ==="
	# TODO: k6 seed script

## 全採点実行
score-all: arch-test type-check lint duplication-check security-test load-test frontend-lint lighthouse bundle-size
	@echo "=== Calculating final score ==="
	node scripts/score.js
	@cat $(REPORTS_DIR)/score.json

## バックエンド採点
arch-test:
	@echo "=== Architecture Quality ==="
	@mkdir -p $(REPORTS_DIR)
	# 循環依存（ファイル単位）
	# TODO: npx madge --circular --json $(SUBMISSION_DIR)/src/ > $(REPORTS_DIR)/circular.json
	# ADR宣言ベースの依存違反（モジュール単位）
	# TODO: node scripts/parse-adr.js → generate-depcruise-config.js → depcruise → calc-arch-violations.js

type-check:
	@echo "=== Type Safety ==="
	@mkdir -p $(REPORTS_DIR)
	# TODO: tsc + type-coverage + eslint @typescript-eslint

lint:
	@echo "=== Code Quality ==="
	@mkdir -p $(REPORTS_DIR)
	# TODO: eslint (recommended + security + n)

duplication-check:
	@echo "=== Code Duplication ==="
	@mkdir -p $(REPORTS_DIR)
	# TODO: jscpd

security-test:
	@echo "=== Security ==="
	@mkdir -p $(REPORTS_DIR)
	# TODO: Bearer

load-test:
	@echo "=== Performance ==="
	@mkdir -p $(REPORTS_DIR)
	# TODO: k6 load test

## フロントエンド採点
frontend-lint:
	@echo "=== Frontend Best Practices ==="
	@mkdir -p $(REPORTS_DIR)
	# TODO: eslint (next + react + react-hooks + jsx-a11y)

lighthouse:
	@echo "=== Lighthouse ==="
	@mkdir -p $(REPORTS_DIR)
	# TODO: lhci collect + extract

bundle-size:
	@echo "=== Bundle Size ==="
	@mkdir -p $(REPORTS_DIR)
	# TODO: next build + measure
