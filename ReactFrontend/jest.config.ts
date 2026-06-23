export default {
  testEnvironment: "jsdom",

  setupFiles: ["<rootDir>/jest.env.ts"],

  setupFilesAfterEnv: ["<rootDir>/setupTests.ts"],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
    // "^.+\\.(ts|tsx)$": "ts-jest",
  },

  moduleNameMapper: {
    "\\.module\\.css$": "identity-obj-proxy",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },

  moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
};
