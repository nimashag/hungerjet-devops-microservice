/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/server.ts',
        '!src/app.ts',
        '!src/**/*.d.ts',
        '!src/config/**',
        '!src/models/**',
        '!src/routes/**',
    ],
    coverageReporters: ['lcov', 'text-summary'],
};
