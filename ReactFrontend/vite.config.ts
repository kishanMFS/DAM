import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
// import EnvironmentPlugin from "vite-plugin-environment";
// import { env } from "process";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return defineConfig({
    // plugins: [react(), EnvironmentPlugin("all")],
    plugins: [react(), tailwindcss()],
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
      proxy: {
        "/dam-assets": {
          target: env.VITE_MINIO_PROXY_TARGET || "http://127.0.0.1:9000",
          changeOrigin: false,
        },
      },
    },
    preview: {
      port: Number(env.VITE_PORT),
    },
    build: {
      target: "esnext",
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("src")) {
              return "app";
            }
            if (id.includes("node_modules")) {
              return "lib";
            }
          },
        },
      },
    },
  });
};
