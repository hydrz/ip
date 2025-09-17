// Network connectivity check
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
		name: "GitHub",
		domain: "github.com",
		elementId: "probe-github",
	},
	{
		name: "YouTube",
		domain: "www.youtube.com",
		elementId: "probe-youtube",
	},
];

// Test connection latency with retries
const testLatency = async (domain, retries = 3) => {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const startTime = performance.now();
			await fetch(`https://${domain}/favicon.ico`, {
				method: "HEAD",
				mode: "no-cors",
				cache: "no-cache",
			});
			const latency = performance.now() - startTime;
			return Math.round(latency);
		} catch (error) {
			if (attempt === retries) {
				console.error(`testLatency for ${domain} failed:`, error.message);
				return null;
			}
			await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
		}
	}
};

// Run multiple tests and calculate average
const runMultipleTests = async (domain, count = 10) => {
	const promises = Array.from({ length: count }, () => testLatency(domain));
	const results = (await Promise.all(promises)).filter((latency) => latency !== null);
	if (results.length === 0) {
		return null;
	}
	const average = results.reduce((sum, latency) => sum + latency, 0) / results.length;
	return Math.round(average);
};

// Update display result with cached element
const updateProbeResult = (elementId, latency) => {
	const element = document.getElementById(elementId);
	if (!element) return;

	if (latency === null) {
		element.className = "text-content text-error";
		element.textContent = "超时";
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

// Run all connectivity tests
const runConnectivityTests = async () => {
	for (const service of PROBE_SERVICES) {
		try {
			const latency = await runMultipleTests(service.domain);
			updateProbeResult(service.elementId, latency);
		} catch (error) {
			console.warn(`Connectivity test failed for ${service.name}:`, error.message);
			updateProbeResult(service.elementId, null);
		}
	}
};

// Run tests on page load
window.addEventListener("DOMContentLoaded", runConnectivityTests);
