# Testing Guide

## Purpose

This guide describes how to run, troubleshoot, and extend tests for this microservices repository.

## Test Strategy

Current backend services use Jest with TypeScript support for API, DB, and unit tests.

Services with Jest test setup:

- delivery-service
- orders-service
- restaurants-service
- users-service

Frontend test setup is not currently configured in frontend-service.

## Standard Test Folder Convention

All backend services now follow a standardized structure under `src/tests`.

```text
src/tests/
	api/    # API / integration-style tests
	db/     # DB and model-mock service tests (when applicable)
	unit/   # Unit tests for controllers, middlewares, and services
```

Current paths used in this repository:

- users-service/src/tests/unit
- restaurants-service/src/tests/api
- restaurants-service/src/tests/db
- restaurants-service/src/tests/unit
- orders-service/src/tests/api
- orders-service/src/tests/unit
- delivery-service/src/tests/unit

Legacy `src/**/__tests__` locations were migrated to this standardized layout.

## 1. Prerequisites

Install the following:

- Node.js 18 or later
- npm 9 or later

Recommended check commands:

- node -v
- npm -v

## 2. Install Dependencies

Run from each service folder before first test run:

- npm ci

If package-lock.json is out of sync in local branch:

- npm install

## 3. Service Test Commands

### delivery-service

In delivery-service:

- npm test
- npm run test:ci

### orders-service

In orders-service:

- npm test
- npm run test:ci

### restaurants-service

In restaurants-service:

- npm test
- npm run test:coverage
- npm run test:ci

### users-service

In users-service:

- npm test
- npm run test:ci

## 4. Coverage Outputs

Jest writes coverage files into each service coverage folder.

Expected files:

- coverage/lcov.info
- coverage/lcov-report/index.html

These LCOV reports are consumed by Sonar analysis during CI.

## 5. Running Tests from Repository Root

Use explicit commands per service.

Examples:

- cd users-service && npm run test:ci
- cd restaurants-service && npm run test:ci
- cd orders-service && npm run test:ci
- cd delivery-service && npm run test:ci

Alternative loop command from repository root:

```bash
for d in users-service restaurants-service orders-service delivery-service; do
	echo "===== $d ====="
	(cd "$d" && npm test -- --watchAll=false)
done
```

If you want sequential full backend verification:

1. cd users-service && npm run test:ci
2. cd ../restaurants-service && npm run test:ci
3. cd ../orders-service && npm run test:ci
4. cd ../delivery-service && npm run test:ci

## 6. Existing Test File Pattern

Typical test locations:

- src/tests/api/\*.test.ts
- src/tests/db/\*.test.ts
- src/tests/unit/\*.test.ts

Examples from this repo:

- restaurants-service/src/tests/api/restaurants.api.test.ts
- restaurants-service/src/tests/db/restaurants.service.db.test.ts
- orders-service/src/tests/unit/orders.controller.test.ts

Common testing pattern:

- Mock service layer with jest.mock.
- Mock logger calls to keep tests deterministic.
- Mock Express Request and Response objects.
- Assert status and payload contract.

## 7. Test Case Design Guidelines

For controller functions, cover at least:

1. Unauthorized requests.
2. Invalid input path.
3. Not found path.
4. Successful path.
5. Internal error path.

For service functions, cover at least:

1. Valid data write and read operations.
2. Validation failures.
3. Dependency failure behavior.
4. Return shapes expected by controllers.

Security-focused tests should include:

- Rejection of invalid identifier formats.
- Rejection of non-string tainted values in query parameters.
- Safe handling for malformed IDs and CastError branches.

## 8. CI Behavior for Tests

In GitHub Actions build-backend matrix:

- npm run test:ci --if-present is executed per backend service.
- Coverage artifacts are uploaded for each service when available.

In security-scan job:

- Coverage artifacts are downloaded.
- lcov.info is copied into each service coverage path.
- Sonar scanner reads those files from sonar-project.properties.

## 9. Debugging Failed Tests

If tests fail in CI but pass locally:

1. Use npm ci instead of npm install.
2. Ensure lockfile is committed.
3. Run tests with --runInBand for deterministic behavior.
4. Verify no hidden environment dependency exists.

Useful command for deterministic local run:

- npm run test:ci -- --runInBand

If TypeScript issues appear only during test compile:

1. Check ts-jest and typescript versions.
2. Confirm Jest config preset is ts-jest.
3. Confirm include paths and rootDir in tsconfig.

## 10. Coverage Improvement Plan

If Sonar quality gate fails on coverage:

1. Prioritize tests for modified files in current branch.
2. Add tests around business-critical controllers first.
3. Add tests for error and guard branches.
4. Add tests to reduce high-risk uncovered lines.

Practical order:

1. Controllers
2. Services
3. Middlewares
4. Utility modules with business logic

## 11. Duplicate Code and Test Quality

To reduce duplication and improve maintainability:

- Use shared test utilities for response/request mocks.
- Avoid copying large fixture objects repeatedly.
- Create factory helpers for common payloads.

## 12. Pull Request Testing Checklist

Before opening a pull request:

1. Run test:ci in every affected backend service.
2. Confirm coverage/lcov.info generated for affected services.
3. Confirm no TypeScript compile errors.
4. Confirm new security checks are covered by tests.
5. Push and verify GitHub Actions is green.
6. Confirm Sonar new code metrics are acceptable.

## 13. FAQ

Q: Why does a service show no coverage in Sonar?
A: Usually test:ci is missing, coverage file was not generated, artifact upload failed, or LCOV path is missing in sonar-project.properties.

Q: Can I run tests without coverage for faster iteration?
A: Yes, use npm test where supported. Use test:ci before push.

Q: Do we have frontend unit tests now?
A: Not currently configured. Add a frontend test stack separately if needed.
