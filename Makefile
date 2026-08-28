.PHONY: dev build test lint format typecheck all

dev:
	npx tsx watch src/index.ts

build:
	npx tsc

test:
	npx tsc -p tsconfig.test.json && node --test dist-tests/tests/config-schema.test.js dist-tests/tests/handlers/modal-handler.test.js dist-tests/tests/handlers/button-handler.test.js dist-tests/tests/events/interactionCreate.test.js dist-tests/tests/idea-service.test.js dist-tests/tests/decision-service.test.js dist-tests/tests/task-service.test.js dist-tests/tests/milestone-service.test.js dist-tests/tests/standup-service.test.js

lint:
	npx eslint src/ --ext .ts

format:
	npx prettier --write "src/**/*.ts"

typecheck:
	npx tsc --noEmit

all: lint typecheck build test
