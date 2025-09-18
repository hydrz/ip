import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
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
	],
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
			},
		},
	},
});
