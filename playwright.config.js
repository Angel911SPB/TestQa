const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  use: {
    baseURL: 'https://polis812.github.io/vacuu',
    viewport: { width: 1920, height: 1080 }
  },
  reporter: [
    ['html'],
    ['list']
  ],
  workers: 2
}); 