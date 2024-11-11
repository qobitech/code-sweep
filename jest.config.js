// jest.config.js
module.exports = {
  testMatch: ["**/__tests__/**/*.test.js", "**/__tests__/**/*.spec.js"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/mockModels/",
    "/__tests__/models/",
  ],
  transform: {},
  testEnvironment: "node",
}
