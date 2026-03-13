/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/server.ts',
        '!src/app.ts',
        '!src/**/*.d.ts',
    ],
    coverageReporters: ['lcov', 'text-summary'],
};
