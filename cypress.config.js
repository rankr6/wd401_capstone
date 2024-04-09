/* eslint-disable no-unused-vars */
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    // Configures the base URL for your application
    baseUrl: "http://localhost:3000",

    // Adjusts the viewport width and height for tests
    viewportWidth: 1280,
    viewportHeight: 720,

    // Configures the timeout for each command
    defaultCommandTimeout: 5000, // 5 seconds

    // Configures the timeout for all requests
    responseTimeout: 10000, // 10 seconds

    // Specifies the folder where Cypress will save screenshots
    screenshotsFolder: "cypress/screenshots",

    // Specifies the folder where Cypress will save videos
    videosFolder: "cypress/videos",

    // Disables taking screenshots for all test runs
    screenshots: false,

    // Disables recording videos for all test runs
    video: false,

    // Adds event listeners for specific Cypress events
    setupNodeEvents(on, config) {
      // Implement node event listeners here
    },

    // Configures how Cypress retries failed tests
    retries: {
      runMode: 2, // Retry failed tests up to 2 times
      openMode: 1, // Retry failed tests up to 1 time in interactive mode
    },

    // Configures the behavior of test retries
    experimentalRetryStrategy: true,
  },
});
