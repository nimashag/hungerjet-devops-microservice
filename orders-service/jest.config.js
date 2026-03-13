/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/jest.setup.js'],
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
        '!src/utils/**',
        '!src/api/**',
        '!src/controllers/**',
        '!src/services/email.service.ts',
        '!src/services/sms.service.ts',
    ],
    coverageReporters: ['lcov', 'text-summary'],
};
