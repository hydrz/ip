// CDN hit node test
const CDN_TESTS = [
	{
		id: "cdn-cloudflare-hit",
		name: "Cloudflare",
		fetch: async () => {
			const response = await fetch("/favicon.svg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const colo = headers.get("cf-ray")?.split("-")[1];
			return colo || "-";
		},
	},
	{
		id: "cdn-fastly-hit",
		name: "Fastly",
		fetch: async () => {
			const response = await fetch("https://any.pops.fastly-analytics.com", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const xServedBy = headers.get("x-served-by");
			if (xServedBy) {
				const parts = xServedBy.split("-");
				return parts[parts.length - 1] || "-";
			}
			return "-";
		},
	},
	{
		id: "cdn-edge-hit",
		name: "EdgeOne",
		fetch: async () => {
			const response = await fetch("https://edge.hydrz.cn/cdn-cgi/trace");
			const text = await response.text();
			const [loc, colo] = text.split("\n").reduce(
				(acc, line) => {
					const [key, value] = line.split("=");
					if (key === "loc") acc[0] = value;
					if (key === "colo") acc[1] = value;
					return acc;
				},
				["", ""],
			);
			return `${loc}->CF-${colo}`;
		},
	},
	{
		id: "cdn-jsdelivr-hit",
		name: "jsDelivr",
		fetch: async () => {
			const response = await fetch("https://cdn.jsdelivr.net/npm/jquery@latest/dist/jquery.min.js", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const server = headers.get("Server");
			if (server && /cloudflare/i.test(server)) {
				const cfRay = headers.get("cf-ray");
				return `Cloudflare${cfRay ? `, ${cfRay.split("-")[1]}` : ""}`;
			}
			if (headers.get("x-id") && headers.get("x-cached-since")) {
				return "G-Core Lab";
			}
			const xServedBy = headers.get("x-served-by");
			if (xServedBy) {
				const parts = xServedBy.split("-");
				return `Fastly${parts ? `, ${parts[parts.length - 1]}` : ""}`;
			}
			return "-";
		},
	},
	{
		id: "cdn-cloudfront-hit",
		name: "AWS CloudFront",
		fetch: async () => {
			const response = await fetch("https://d3888oxgux3fey.cloudfront.net/500b-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const pop = headers.get("x-amz-cf-pop");
			return pop?.split(";")[0] || "-";
		},
	},
	{
		id: "cdn-bunnystandard-hit",
		name: "Bunny Standard",
		fetch: async () => {
			const response = await fetch("https://test.b-cdn.net/", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const server = headers.get("Server");
			if (server) {
				const parts = server.split("-");
				return `${parts[1]}-${parts[2]}` || "-";
			}
			return "-";
		},
	},
	{
		id: "cdn-bunnyvolume-hit",
		name: "Bunny Volume",
		fetch: async () => {
			const response = await fetch("https://testvideo.b-cdn.net/", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const server = headers.get("Server");
			if (server) {
				const parts = server.split("-");
				return `${parts[1]}-${parts[2]}` || "-";
			}
			return "-";
		},
	},
	{
		id: "cdn-cdn77-hit",
		name: "CDN77",
		fetch: async () => {
			const response = await fetch("https://1596384882.rsc.cdn77.org/500b-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const pop = headers.get("x-77-pop");
			return pop || "-";
		},
	},
	{
		id: "cdn-gcorelabs-hit",
		name: "G-Core Labs",
		fetch: async () => {
			const response = await fetch("https://perfops.gcorelabs.com/500b-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const id = headers.get("x-id");
			return id?.replace(/-edge/i, "") || "-";
		},
	},
	{
		id: "cdn-virtuozzo-hit",
		name: "Virtuozzo (CDN.net)",
		fetch: async () => {
			const response = await fetch("https://perfops.r.worldssl.net/500b-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const location = headers.get("x-edge-location");
			return location || "-";
		},
	},
	{
		id: "cdn-ovh-hit",
		name: "OVH CDN",
		fetch: async () => {
			const response = await fetch("https://ovh-cdn.perfops.io/500b-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const pop = headers.get("x-cdn-pop");
			return pop || "-";
		},
	},
	{
		id: "cdn-cachefly-hit",
		name: "CacheFly",
		fetch: async () => {
			const response = await fetch("https://cdnperf.cachefly.net/500b-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const cf1 = headers.get("x-cf1");
			if (cf1) {
				return cf1.split(":")[4]?.split(".")[1] || "-";
			}
			return "-";
		},
	},
	{
		id: "cdn-medianova-hit",
		name: "Medianova",
		fetch: async () => {
			const response = await fetch("https://medianova-cdnvperf.mncdn.com/500b-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const location = headers.get("x-edge-location");
			return location || "-";
		},
	},
	{
		id: "cdn-zenlayer-hit",
		name: "Zenlayer",
		fetch: async () => {
			const response = await fetch("https://test-perfops.ecn.zenlayer.net/500b-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const via = headers.get("via");
			if (via) {
				const matches = via.match(/\s[A-Z]{2}\.[\dA-Z]{2,}/g);
				return matches?.map((m) => m.trim()).join(", ") || "-";
			}
			return "-";
		},
	},
	{
		id: "cdn-melbicom-hit",
		name: "Melbicom",
		fetch: async () => {
			const response = await fetch("https://perfops.swiftycdn.net/500b-sw-bench.jpg", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			const headers = response.headers;
			const node = headers.get("x-swifty-node");
			if (node) {
				return node;
			}
			return "-";
		},
	},
	{
		id: "cdn-keycdn-hit",
		name: "KeyCDN",
		fetch: async () => {
			const response = await fetch("https://www.keycdn.com/favicon.ico", {
				method: "HEAD",
				referrerPolicy: "no-referrer",
				credentials: "omit",
				mode: "cors", // 尝试cors模式
			});
			const headers = response.headers;
			const location = headers.get("x-edge-location");
			return location || "-";
		},
	},
];

// Run CDN tests with retries
const runCDNTests = async () => {
	const promises = CDN_TESTS.map(async (test) => {
		let result = "获取失败";
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 3000);
				result = await test.fetch();
				clearTimeout(timeoutId);
				break;
			} catch (error) {
				console.error(`Failed to test ${test.name} on attempt ${attempt}:`, error.message);
				if (attempt === 3) result = "网络错误，请重试";
				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
			}
		}
		const element = document.getElementById(test.id);
		if (element) element.textContent = result;
	});
	await Promise.all(promises);
};

window.addEventListener("DOMContentLoaded", runCDNTests);
