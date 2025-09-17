// CDN 命中节点测试
const CDN_TESTS = [
	{
		id: "cdn-cloudflare-hit",
		name: "Cloudflare",
		url: "/favicon.svg",
		parse: (headers) => {
			const colo = headers.get("cf-ray")?.split("-")[1];
			return colo || "-";
		},
	},
	{
		id: "cdn-fastly-hit",
		name: "Fastly",
		url: "https://any.pops.fastly-analytics.com",
		parse: (headers) => {
			const xServedBy = headers.get("x-served-by");
			if (xServedBy) {
				const parts = xServedBy.split("-");
				return parts[parts.length - 1] || "-";
			}
			return "-";
		},
	},
	{
		id: "cdn-globalcache-hit",
		name: "Global Cache",
		url: "https://media-edge.1e100cdn.net/pics/500b-bench.jpg",
		parse: (headers) => {
			const cacheStatus = headers.get("cache-status");
			return cacheStatus?.split(";")[0] || "-";
		},
	},
	{
		id: "cdn-jsdelivr-hit",
		name: "jsDelivr",
		url: "https://cdn.jsdelivr.net/npm/sukkaw@latest/package.json",
		parse: (headers) => {
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
		url: "https://d3888oxgux3fey.cloudfront.net/500b-bench.jpg",
		parse: (headers) => {
			const pop = headers.get("x-amz-cf-pop");
			return pop?.split(";")[0] || "-";
		},
	},
	{
		id: "cdn-bunnystandard-hit",
		name: "Bunny Standard",
		url: "https://test.b-cdn.net/",
		parse: (headers) => {
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
		url: "https://testvideo.b-cdn.net/",
		parse: (headers) => {
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
		url: "https://1596384882.rsc.cdn77.org/500b-bench.jpg",
		parse: (headers) => {
			const pop = headers.get("x-77-pop");
			return pop || "-";
		},
	},
	{
		id: "cdn-gcorelabs-hit",
		name: "G-Core Labs",
		url: "https://perfops.gcorelabs.com/500b-bench.jpg",
		parse: (headers) => {
			const id = headers.get("x-id");
			return id?.replace(/-edge/i, "") || "-";
		},
	},
	{
		id: "cdn-virtuozzo-hit",
		name: "Virtuozzo (CDN.net)",
		url: "https://perfops.r.worldssl.net/500b-bench.jpg",
		parse: (headers) => {
			const location = headers.get("x-edge-location");
			return location || "-";
		},
	},
	{
		id: "cdn-ovh-hit",
		name: "OVH CDN",
		url: "https://ovh-cdn.perfops.io/500b-bench.jpg",
		parse: (headers) => {
			const pop = headers.get("x-cdn-pop");
			return pop || "-";
		},
	},
	{
		id: "cdn-cachefly-hit",
		name: "CacheFly",
		url: "https://cdnperf.cachefly.net/500b-bench.jpg",
		parse: (headers) => {
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
		url: "https://medianova-cdnvperf.mncdn.com/500b-bench.jpg",
		parse: (headers) => {
			const location = headers.get("x-edge-location");
			return location || "-";
		},
	},
	{
		id: "cdn-zenlayer-hit",
		name: "Zenlayer",
		url: "https://test-perfops.ecn.zenlayer.net/500b-bench.jpg",
		parse: (headers) => {
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
		url: "https://perfops.swiftycdn.net/500b-sw-bench.jpg",
		parse: (headers) => {
			const node = headers.get("x-swifty-node");
			if (node) {
				return node;
			}
			return "-";
		},
	},
];

// 获取响应头
async function fetchHeaders(url) {
	try {
		// 将相对URL转换为绝对URL
		const absoluteUrl = url.startsWith("http") ? url : window.location.origin + url;
		const response = await fetch(absoluteUrl, {
			method: "HEAD",
			referrerPolicy: "no-referrer",
			credentials: "omit",
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response.headers;
	} catch (error) {
		console.error(`Failed to fetch headers from ${url}:`, error);
		return null;
	}
}

// 运行CDN测试
async function runCDNTests() {
	for (const test of CDN_TESTS) {
		try {
			const headers = await fetchHeaders(test.url);
			if (headers) {
				const result = test.parse(headers);
				const element = document.getElementById(test.id);
				if (element) {
					element.textContent = result;
				}
			} else {
				const element = document.getElementById(test.id);
				if (element) {
					element.textContent = "获取失败";
				}
			}
		} catch (error) {
			console.error(`Failed to test ${test.name}:`, error);
			const element = document.getElementById(test.id);
			if (element) {
				element.textContent = "获取失败";
			}
		}
	}
}

// 页面加载完成后运行测试
window.addEventListener("DOMContentLoaded", runCDNTests);
