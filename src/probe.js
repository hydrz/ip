// 网络连通性检查
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

// 测试连接延迟
async function testLatency(domain) {
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
		console.error(`Failed to test latency for ${domain}:`, error);
		return null;
	}
}

// 运行多次测试并计算平均值
async function runMultipleTests(domain, count = 10) {
	const results = [];
	for (let i = 0; i < count; i++) {
		const latency = await testLatency(domain);
		if (latency !== null) {
			results.push(latency);
		}
		// 小延迟避免过于频繁的请求
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	if (results.length === 0) {
		return null;
	}

	// 计算平均值
	const average = results.reduce((sum, latency) => sum + latency, 0) / results.length;
	return Math.round(average);
}

// 更新显示结果
function updateProbeResult(elementId, latency) {
	const element = document.getElementById(elementId);
	if (element) {
		if (latency === null) {
			element.className = "text-content text-error";
			element.textContent = "超时";
			return;
		}

		element.textContent = `${latency}ms`;

		if (latency < 100) {
			element.className = "text-content text-success";
		} else if (latency < 300) {
			element.className = "text-content text-warning";
		} else {
			element.className = "text-content text-error";
		}
	}
}

// 运行所有连通性测试
async function runConnectivityTests() {
	for (const service of PROBE_SERVICES) {
		try {
			const latency = await runMultipleTests(service.domain);
			updateProbeResult(service.elementId, latency);
		} catch (error) {
			console.error(`Failed to test ${service.name}:`, error);
			updateProbeResult(service.elementId, null);
		}
	}
}

// 页面加载完成后运行测试
window.addEventListener("DOMContentLoaded", runConnectivityTests);
