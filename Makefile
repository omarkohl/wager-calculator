.PHONY: help dev build preview lint typecheck lint-watch test test-watch test-ui test-coverage test-e2e test-e2e-headed test-e2e-ui format format-check precommit install install-playwright clean clean-all

SHELL := /usr/bin/env bash

help:
	@printf "Available commands:\n"
	@printf "\nDevelopment:\n"
	@printf "  %-28s %s\n" "make dev"                "Start development server"
	@printf "  %-28s %s\n" "make precommit"          "Format, lint, typecheck, and run all tests (incl. e2e)"
	@printf "\nBuilding:\n"
	@printf "  %-28s %s\n" "make build"              "Build for production"
	@printf "  %-28s %s\n" "make preview"            "Serve the production build locally"
	@printf "\nTesting:\n"
	@printf "  %-28s %s\n" "make test"               "Run all unit and integration tests"
	@printf "  %-28s %s\n" "make test-watch"         "Run tests in watch mode"
	@printf "  %-28s %s\n" "make test-ui"            "Open the Vitest UI"
	@printf "  %-28s %s\n" "make test-coverage"      "Run tests with coverage"
	@printf "  %-28s %s\n" "make test-e2e"           "Run E2E tests (headless)"
	@printf "  %-28s %s\n" "make test-e2e-headed"    "Run E2E tests (headed, for local dev)"
	@printf "  %-28s %s\n" "make test-e2e-ui"        "Open the Playwright UI"
	@printf "\nLinting & Formatting:\n"
	@printf "  %-28s %s\n" "make lint"               "Run linter"
	@printf "  %-28s %s\n" "make lint-watch"         "Run linter in watch mode"
	@printf "  %-28s %s\n" "make typecheck"          "Run TypeScript type checking"
	@printf "  %-28s %s\n" "make format"             "Format code"
	@printf "  %-28s %s\n" "make format-check"       "Check code formatting"
	@printf "\nDependencies:\n"
	@printf "  %-28s %s\n" "make install"            "Install dependencies"
	@printf "  %-28s %s\n" "make install-playwright" "Install Playwright browsers"
	@printf "\nCleanup:\n"
	@printf "  %-28s %s\n" "make clean"              "Remove build artifacts and test output"
	@printf "  %-28s %s\n" "make clean-all"          "Clean + remove node_modules"

install: node_modules/.install-stamp

# Reinstall only when the manifest or lockfile changes. Cloud sessions install
# with a fallback (see .claude/hooks/session-start.sh) and touch the stamp.
node_modules/.install-stamp: package.json bun.lock
	bun install --frozen-lockfile
	touch $@

install-playwright: install
	bun x playwright install

dev: install
	bun x vite

build: install
	bun run build

preview: build
	bun x vite preview

lint: install
	bun x eslint --max-warnings 0 .

typecheck: install
	bun x tsc --noEmit

lint-watch: install
	watchexec -c -w src -w e2e "bun x eslint --fix ."

test: install
	bun x vitest run

test-watch: install
	bun x vitest

test-ui: install
	bun x vitest --ui

test-coverage: install
	bun x vitest run --coverage

# Playwright builds and serves the app itself (see webServer in
# playwright.config.ts), so these need no separate build step.
test-e2e: install-playwright
	bun x playwright test

test-e2e-headed: install-playwright
	bun x playwright test --headed

test-e2e-ui: install-playwright
	bun x playwright test --ui

format: install
	bun x prettier --write .

format-check: install
	bun x prettier --check .

precommit: format lint typecheck test-coverage test-e2e

clean:
	rm -rf dist dev-dist
	rm -rf coverage
	rm -rf playwright-report test-results
	rm -f tsconfig.tsbuildinfo

clean-all: clean
	rm -rf node_modules
