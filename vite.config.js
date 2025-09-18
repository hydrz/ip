import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import { ViteMinifyPlugin } from "vite-plugin-minify";
import Sitemap from "vite-plugin-sitemap";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [
		cloudflare(),
		Sitemap({
			hostname: "https://ip.hydrz.cn",
			generateRobotsTxt: true,
			robots: [{ userAgent: "*", allow: "/" }],
		}),
		ViteMinifyPlugin({}),
	],
	build: {
		minify: "terser",
		sourcemap: false,
		reportCompressedSize: true,
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
			},
		},
		rollupOptions: {
			input: {
				index: resolve(__dirname, "index.html"),
			},
			output: {
				chunkFileNames: "assets/[name]-[hash].js",
				assetFileNames: "assets/[name]-[hash].[ext]",
			},
		},
	},
});
