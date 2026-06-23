import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
// import EnvironmentPlugin from "vite-plugin-environment";
// import { env } from "process";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return defineConfig({
    // plugins: [react(), EnvironmentPlugin("all")],
    plugins: [react()],
    base: process.env.VITE_BASE_PATH || "/",
    // define: {
    //   envWithProcessPrefix: {
    //     "process.env": `${JSON.stringify(env)}`,
    //   },
    // },
    server: {
      hmr: {
        overlay: true,
      },
      port: Number(env.VITE_PORT),
    },
    preview: {
      port: Number(env.VITE_PORT),
    },
  });
};
