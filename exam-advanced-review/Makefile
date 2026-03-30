SUBMISSION_DIR ?= ../exam-advanced
BACKEND_SRC = $(SUBMISSION_DIR)/backend
FRONTEND_SRC = $(SUBMISSION_DIR)/frontend
REPORTS_DIR = reports

.PHONY: all e2e-test seed score-all clean \
	arch-test type-check lint duplication-backend security-test load-test sonarjs-backend \
	frontend-type-check frontend-lint frontend-deps duplication-frontend lighthouse sonarjs-frontend

all: e2e-test score-all

$(REPORTS_DIR):
	mkdir -p $(REPORTS_DIR)

## 足切り（APIテスト + E2Eテスト）
gate:
	@echo "=== Gate: API Test + E2E Test (pass/fail) ==="
	cd $(SUBMISSION_DIR) && docker compose run --rm tests pnpm test:api
	cd $(SUBMISSION_DIR) && docker compose run --rm tests pnpm test:e2e

## シードデータ投入
seed:
	@echo "=== Seeding data via k6 (~100k records) ==="
	chmod 777 $(REPORTS_DIR) 2>/dev/null || true
	docker run --rm --network=host -e API_URL=http://localhost:3000/api -e SEED_COUNT=500000 \
		-v $(CURDIR)/tests:/scripts grafana/k6 run /scripts/seed.js 2>&1 || true

## ============================================================
## バックエンド
## ============================================================

arch-test: $(REPORTS_DIR)
	@echo "=== Architecture Quality ==="
	npx madge --circular --json $(BACKEND_SRC)/src/ > $(REPORTS_DIR)/circular.json 2>/dev/null || echo "[]" > $(REPORTS_DIR)/circular.json
	node scripts/parse-adr.js $(SUBMISSION_DIR)/adr/backend-architecture.md > $(REPORTS_DIR)/modules-backend.json
	node scripts/generate-depcruise-config.js $(REPORTS_DIR)/modules-backend.json > $(REPORTS_DIR)/.dependency-cruiser.cjs
	cd $(BACKEND_SRC) && find src -name '*.ts' | xargs npx --yes dependency-cruiser --config $(CURDIR)/$(REPORTS_DIR)/.dependency-cruiser.cjs --ts-pre-compilation-deps --output-type json > $(CURDIR)/$(REPORTS_DIR)/depcruise-backend.json 2>/dev/null || echo '{"modules":[]}' > $(CURDIR)/$(REPORTS_DIR)/depcruise-backend.json
	node scripts/calc-arch-violations.js $(REPORTS_DIR)/depcruise-backend.json $(REPORTS_DIR)/modules-backend.json > $(REPORTS_DIR)/adr-deps.json
	node scripts/calc-external-spread.js $(REPORTS_DIR)/depcruise-backend.json $(REPORTS_DIR)/modules-backend.json > $(REPORTS_DIR)/external-spread.json

type-check: $(REPORTS_DIR)
	@echo "=== Type Safety ==="
	cd $(BACKEND_SRC) && npx --yes type-coverage --at-least 0 --ignore-files 'generated/**' --ignore-files '.prisma/**' --ignore-files 'drizzle/**' --ignore-files '**/migrations/**' 2>&1 | grep -oP '\((\d+) / (\d+)\) ([\d.]+)%' | head -1 | sed 's/(\([0-9]*\) \/ \([0-9]*\)) \([0-9.]*\)%/{"correctCount":\1,"totalCount":\2,"percent":\3}/' > $(CURDIR)/$(REPORTS_DIR)/type-coverage.json || echo '{"percent":0}' > $(REPORTS_DIR)/type-coverage.json
	# Biomeでコードの書き方をチェック
	npx biome lint $(BACKEND_SRC)/src --config-path $(CURDIR)/configs/biome.json --reporter json 2>/dev/null | grep '^{' | head -1 > $(REPORTS_DIR)/biome-backend.json || echo '{"diagnostics":[]}' > $(REPORTS_DIR)/biome-backend.json

sonarjs-backend: $(REPORTS_DIR)
	@echo "=== Backend SonarJS ==="
	node scripts/run-sonarjs.js $(BACKEND_SRC)/src $(REPORTS_DIR)/sonarjs-backend.json

duplication-backend: $(REPORTS_DIR)
	@echo "=== Backend Duplication ==="
	# リテラル正規化してからjscpdで構造的重複を検出
	rm -rf $(REPORTS_DIR)/normalized-backend && mkdir -p $(REPORTS_DIR)/normalized-backend
	find $(BACKEND_SRC)/src -name '*.ts' -not -path '*/generated/*' -not -path '*/.prisma/*' -not -path '*/drizzle/*' -not -path '*/migrations/*' -not -name '*.d.ts' -exec sh -c 'sed "s/\"[^\"]*\"/\"***\"/g" "$$1" > $(REPORTS_DIR)/normalized-backend/$$(basename "$$1")' _ {} \;
	npx jscpd $(REPORTS_DIR)/normalized-backend --mode strict --min-lines 3 --min-tokens 30 --reporters json --output $(REPORTS_DIR)/jscpd-backend-raw 2>/dev/null || true
	cp $(REPORTS_DIR)/jscpd-backend-raw/jscpd-report.json $(REPORTS_DIR)/jscpd-backend.json 2>/dev/null || echo '{"statistics":{"total":{"percentage":"0"}}}' > $(REPORTS_DIR)/jscpd-backend.json
	rm -rf $(REPORTS_DIR)/normalized-backend

security-test: $(REPORTS_DIR)
	@echo "=== Security ==="
	docker run --rm -v $(BACKEND_SRC):/tmp/scan bearer/bearer:latest-amd64 scan /tmp/scan --format json --output /tmp/scan/.bearer-report.json 2>/dev/null || true
	cp $(BACKEND_SRC)/.bearer-report.json $(REPORTS_DIR)/security.json 2>/dev/null || echo '{"findings":[]}' > $(REPORTS_DIR)/security.json
	rm -f $(BACKEND_SRC)/.bearer-report.json

load-test: $(REPORTS_DIR)
	@echo "=== Performance (GET) ==="
	chmod 777 $(REPORTS_DIR)
	docker run --rm --network=host -e API_URL=http://localhost:3000/api \
		-v $(CURDIR)/tests:/scripts -v $(CURDIR)/$(REPORTS_DIR):/reports \
		grafana/k6 run --summary-export=/reports/perf-get-summary.json /scripts/load-test-get.js 2>&1 || true
	node -e "const d=require('./$(REPORTS_DIR)/perf-get-summary.json'); console.log(JSON.stringify({p95:d.metrics.http_req_duration?.['p(95)']||d.metrics.http_req_duration?.values?.['p(95)']||0},null,2))" > $(REPORTS_DIR)/perf-get.json 2>/dev/null || echo '{"p95":0}' > $(REPORTS_DIR)/perf-get.json
	@echo "=== Performance (POST) ==="
	docker run --rm --network=host -e API_URL=http://localhost:3000/api \
		-v $(CURDIR)/tests:/scripts -v $(CURDIR)/$(REPORTS_DIR):/reports \
		grafana/k6 run --summary-export=/reports/perf-post-summary.json /scripts/load-test-post.js 2>&1 || true
	node -e "const d=require('./$(REPORTS_DIR)/perf-post-summary.json'); console.log(JSON.stringify({p95:d.metrics.http_req_duration?.['p(95)']||d.metrics.http_req_duration?.values?.['p(95)']||0},null,2))" > $(REPORTS_DIR)/perf-post.json 2>/dev/null || echo '{"p95":0}' > $(REPORTS_DIR)/perf-post.json
	@echo "=== Concurrency (double booking) ==="
	docker run --rm --network=host -e API_URL=http://localhost:3000/api \
		-v $(CURDIR)/tests:/scripts -v $(CURDIR)/$(REPORTS_DIR):/reports \
		grafana/k6 run --summary-export=/reports/concurrency-summary.json /scripts/concurrency-test.js 2>&1 || true
	node -e "const d=require('./$(REPORTS_DIR)/concurrency-summary.json'); const s=d.metrics.successful_bookings?.count||d.metrics.successful_bookings?.values?.count||0; console.log(JSON.stringify({successfulBookings:s,isCorrect:s===1},null,2))" > $(REPORTS_DIR)/concurrency.json 2>/dev/null || echo '{"successfulBookings":0,"isCorrect":false}' > $(REPORTS_DIR)/concurrency.json

## ============================================================
## フロントエンド
## ============================================================

frontend-type-check: $(REPORTS_DIR)
	@echo "=== Frontend Type Safety ==="
	@TS_COUNT=$$(find $(FRONTEND_SRC) -name '*.ts' -not -path '*/.next/*' -not -path '*/node_modules/*' -not -name '*.config.ts' -not -name 'next-env.d.ts' | wc -l); \
	if [ "$$TS_COUNT" -eq 0 ]; then \
		echo '{"correctCount":0,"totalCount":0,"percent":0}' > $(REPORTS_DIR)/frontend-type-coverage.json; \
		echo "  No .ts files found -> 0%"; \
	else \
		cd $(FRONTEND_SRC) && npx --yes type-coverage --at-least 0 \
			--ignore-files '.next/**' --ignore-files '**/*.tsx' --ignore-files '**/*.config.ts' --ignore-files 'next-env.d.ts' \
			2>&1 | grep -oP '\((\d+) / (\d+)\) ([\d.]+)%' | head -1 \
			| sed 's/(\([0-9]*\) \/ \([0-9]*\)) \([0-9.]*\)%/{"correctCount":\1,"totalCount":\2,"percent":\3}/' \
			> $(CURDIR)/$(REPORTS_DIR)/frontend-type-coverage.json \
			|| echo '{"percent":0}' > $(REPORTS_DIR)/frontend-type-coverage.json; \
	fi

frontend-biome: $(REPORTS_DIR)
	@echo "=== Frontend Code Quality (Biome) ==="
	npx biome lint $(FRONTEND_SRC)/app --config-path $(CURDIR)/configs/biome.json --reporter json 2>/dev/null | grep '^{' | head -1 > $(REPORTS_DIR)/biome-frontend.json || echo '{"diagnostics":[]}' > $(REPORTS_DIR)/biome-frontend.json

sonarjs-frontend: $(REPORTS_DIR)
	@echo "=== Frontend SonarJS ==="
	node scripts/run-sonarjs.js $(FRONTEND_SRC)/app $(REPORTS_DIR)/sonarjs-frontend.json

frontend-deps: $(REPORTS_DIR)
	@echo "=== Frontend Dependencies ==="
	node scripts/parse-adr.js $(SUBMISSION_DIR)/adr/frontend-architecture.md > $(REPORTS_DIR)/modules-frontend.json
	node scripts/generate-depcruise-config.js $(REPORTS_DIR)/modules-frontend.json > $(REPORTS_DIR)/.dependency-cruiser-frontend.cjs
	cd $(FRONTEND_SRC) && find app -name '*.ts' -o -name '*.tsx' | xargs npx --yes dependency-cruiser --config $(CURDIR)/$(REPORTS_DIR)/.dependency-cruiser-frontend.cjs --ts-pre-compilation-deps --output-type json > $(CURDIR)/$(REPORTS_DIR)/depcruise-frontend.json 2>/dev/null || echo '{"modules":[]}' > $(CURDIR)/$(REPORTS_DIR)/depcruise-frontend.json
	node scripts/calc-arch-violations.js $(REPORTS_DIR)/depcruise-frontend.json $(REPORTS_DIR)/modules-frontend.json > $(REPORTS_DIR)/frontend-deps.json
	npx madge --circular --json $(FRONTEND_SRC)/app/ > $(REPORTS_DIR)/frontend-circular.json 2>/dev/null || echo "[]" > $(REPORTS_DIR)/frontend-circular.json
	node scripts/calc-external-spread.js $(REPORTS_DIR)/depcruise-frontend.json $(REPORTS_DIR)/modules-frontend.json > $(REPORTS_DIR)/frontend-external-spread.json

duplication-frontend: $(REPORTS_DIR)
	@echo "=== Frontend Duplication ==="
	rm -rf $(REPORTS_DIR)/normalized-frontend && mkdir -p $(REPORTS_DIR)/normalized-frontend
	find $(FRONTEND_SRC)/app -name '*.ts' -o -name '*.tsx' | while read f; do sed 's/"[^"]*"/"***"/g' "$$f" > $(REPORTS_DIR)/normalized-frontend/$$(basename "$$f"); done
	npx jscpd $(REPORTS_DIR)/normalized-frontend --mode strict --min-lines 3 --min-tokens 30 --reporters json --output $(REPORTS_DIR)/jscpd-frontend-raw 2>/dev/null || true
	cp $(REPORTS_DIR)/jscpd-frontend-raw/jscpd-report.json $(REPORTS_DIR)/jscpd-frontend.json 2>/dev/null || echo '{"statistics":{"total":{"percentage":"0"}}}' > $(REPORTS_DIR)/jscpd-frontend.json
	rm -rf $(REPORTS_DIR)/normalized-frontend


## ============================================================
## 全採点
## ============================================================

score-all: arch-test type-check sonarjs-backend duplication-backend security-test load-test \
	frontend-type-check frontend-biome sonarjs-frontend frontend-deps duplication-frontend
	@echo "=== Calculating final score ==="
	SUBMISSION_DIR=$(SUBMISSION_DIR) node scripts/score.js

clean:
	rm -rf $(REPORTS_DIR)
