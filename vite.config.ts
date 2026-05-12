import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/client"),
		},
	},
	build: {
		outDir: "dist/client",
		emptyOutDir: true,
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:32123",
				changeOrigin: true,
			},
		},
	},
});
