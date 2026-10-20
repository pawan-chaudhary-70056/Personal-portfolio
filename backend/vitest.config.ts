import { defineConfig } from 'vitest/config'
import { TEST_DATABASE_URL, TEST_SESSION_SECRET } from './tests/config.js'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The suite shares one database, so tests must not run concurrently.
    fileParallelism: false,
    globalSetup: ['./tests/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      SESSION_SECRET: TEST_SESSION_SECRET,
      SESSION_COOKIE_NAME: 'portfolio.sid',
      FRONTEND_ORIGIN: 'http://localhost:5173',
      TRUST_PROXY: 'false',
    },
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
})
