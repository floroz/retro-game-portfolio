import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { optimizeImages } from "./scripts/vite/optimize-images";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    optimizeImages(),
  ],
  css: {
    modules: {
      localsConvention: "camelCase",
      generateScopedName: "[name]__[local]___[hash:base64:5]",
    },
  },
});
