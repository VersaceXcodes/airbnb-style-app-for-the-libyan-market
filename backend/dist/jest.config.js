module.exports = {
    "testEnvironment": "node",
    "preset": "ts-jest",
    "roots": [
        "<rootDir>/src",
        "<rootDir>/tests"
    ],
    "testMatch": [
        "**/__tests__/**/*.ts",
        "**/?(*.)+(spec|test).ts"
    ],
    "transform": {
        "^.+\\.ts$": "ts-jest"
    },
    "collectCoverageFrom": [
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/server.ts"
    ],
    "coverageDirectory": "coverage",
    "coverageReporters": [
        "text",
        "lcov",
        "html"
    ],
    "setupFilesAfterEnv": [
        "<rootDir>/tests/setup.ts"
    ],
    "testTimeout": 10000,
    "verbose": true,
    "forceExit": true,
    "detectOpenHandles": true
};
export {};
//# sourceMappingURL=jest.config.js.map