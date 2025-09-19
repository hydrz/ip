import { MESSAGES } from "./lib/ui.js";
import { fetchWithTimeout, runWithRetries, sleep } from "./lib/utils.js";

const PROBE_TEST_TIMEOUT = 3000;
const PROBE_TEST_DELAY = 100;

// Network connectivity test services
const PROBE_SERVICES = [
	{
		name: "百度搜索",
		domain: "www.baidu.com",
		elementId: "probe-baidu",
	},
	{
		name: "网易云音乐",
		domain: "music.163.com",
		elementId: "probe-163",
	},
	{
		name: "抖音",
		domain: "www.douyin.com",
		elementId: "probe-douyin",
	},
	{
		name: "腾讯视频",
		domain: "v.qq.com",
		elementId: "probe-tencent-video",
	},
	{
		name: "GitHub",
		domain: "github.com",
		elementId: "probe-github",
	},
	{
		name: "YouTube",
		domain: "www.youtube.com",
		elementId: "probe-youtube",
	},
	{
		name: "TikTok",
		domain: "www.tiktok.com",
		elementId: "probe-tiktok",
	},
	{
		name: "Netflix",
		domain: "www.netflix.com",
		elementId: "probe-netflix",
	},
];

// Test connection latency with retries
const testLatency = async (domain, retries = 3, timeout = PROBE_TEST_TIMEOUT) => {
	return runWithRetries(
		async () => {
			const start = performance.now();
			await fetchWithTimeout(
				`https://${domain}/favicon.ico`,
				{
					method: "HEAD",
					mode: "no-cors",
					cache: "no-cache",
					referrerPolicy: "no-referrer",
					credentials: "omit",
				},
				timeout,
			);
			return Math.round(performance.now() - start);
		},
		{ retries, timeoutPerAttempt: timeout },
	).catch(() => null);
};

// Run multiple latency tests and calculate average
const runMultipleTests = async (domain, count = 10) => {
	const results = [];
	for (let i = 0; i < count; i += 1) {
		const result = await testLatency(domain, 2, 2500);
		if (result !== null) results.push(result);
		await sleep(PROBE_TEST_DELAY);
	}

	if (results.length === 0) return null;
	return Math.round(results.reduce((sum, value) => sum + value, 0) / results.length);
};

// Update probe result display
const updateProbeResult = (elementId, latency) => {
	const element = document.getElementById(elementId);
	if (!element) return;

	if (latency === null) {
		element.className = "text-content text-error";
		element.textContent = MESSAGES.TIMEOUT;
		return;
	}

	element.textContent = `${latency}ms`;
	element.className =
		latency < 100
			? "text-content text-success"
			: latency < 300
				? "text-content text-warning"
				: "text-content text-error";
};

// Run connectivity tests for all services
const runConnectivityTests = async () => {
	const testPromises = PROBE_SERVICES.map(async (service) => {
		try {
			const latency = await runMultipleTests(service.domain);
			updateProbeResult(service.elementId, latency);
		} catch (error) {
			console.warn(`Connectivity test failed for ${service.name}:`, error.message);
			updateProbeResult(service.elementId, null);
		}
	});

	await Promise.all(testPromises);
};

// Initialize connectivity tests on page load
window.addEventListener("DOMContentLoaded", runConnectivityTests);
