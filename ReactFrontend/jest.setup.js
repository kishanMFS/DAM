// import dotenv from "dotenv";
// dotenv.config();
// Polyfill import.meta.env for Jest
global.import = {
  meta: {
    env: {
      VITE_loginAPI: process.env.VITE_loginAPI || "http://localhost:3000",
      VITE_BASE_PATH: process.env.VITE_BASE_PATH || "",
    },
  },
};
