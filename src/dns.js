// DNS 出口查询
// 此模块负责查询多个DNS服务以获取DNS出口信息

// 常量定义
const MAX_DNS_RESULTS = 8;
const UPDATE_DELAY_MS = 100;
const REQUEST_DELAY_MS = 200;
const MAX_ATTEMPTS_DEFAULT = 9;
const MAX_ATTEMPTS_ALIYUN = 4;

// DNS 服务配置数组
const DNS_SERVICES = [
	{
		name: "Fastly",
		url: (timestamp, random) =>
			`https://${timestamp}-${random}.u.fastly-analytics.com/debug_resolver`,
		parse: (data) => {
			const resolver = data.dns_resolver_info;
			if (resolver?.ip) {
				return {
					ip: resolver.ip,
					provider: "Fastly",
					isp: resolver.as_name || "",
					location: resolver.cc || "",
				};
			}
			return null;
		},
	},
	{
		name: "IPAPI",
		url: (timestamp, random) =>
			`https://${timestamp}-${random}--hydrz.edns.ip-api.com/json`,
		parse: (data) => {
			const dnsInfo = data.dns;
			if (dnsInfo?.ip) {
				return {
					ip: dnsInfo.ip,
					provider: "IPAPI",
					isp: dnsInfo.geo ? dnsInfo.geo.split(" - ")[1] : "",
					location: dnsInfo.geo ? dnsInfo.geo.split(" - ")[0] : "",
				};
			}
			return null;
		},
	},
	{
		name: "Surfshark",
		url: (random) => `https://${random}.ipv4.surfsharkdns.com/`,
		parse: (data) => {
			const results = [];
			for (const [ip, info] of Object.entries(data)) {
				results.push({
					ip,
					provider: "Shark",
					isp: info.ISP || "",
					location: `${info.Country} ${info.City}`.trim(),
				});
			}
			return results;
		},
	},
];

// 生成随机字符串用于URL参数
function generateRandomId(length = 15) {
	return Math.random()
		.toString(36)
		.slice(2, 2 + length);
}

// 获取单个DNS服务的出口信息
async function fetchDNSInfo(service) {
	try {
		const timestamp = Date.now();
		const random = generateRandomId();

		let url;
		if (service.name === "Surfshark") {
			// Surfshark 使用不同的URL格式
			url = service.url(random);
		} else {
			// 其他服务使用时间戳和随机字符串
			url = service.url(timestamp, random);
		}

		// 使用直接fetch请求
		const response = await fetch(url, {
			referrerPolicy: 'no-referrer',
			credentials: 'omit'
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const contentType = response.headers.get('content-type');
		let data;
		if (contentType?.includes('application/json')) {
			data = await response.json();
		} else {
			data = await response.text();
		}

		const result = service.parse(data);

		if (!result) {
			console.warn(`${service.name} 返回的数据无法解析`);
		}

		return result;
	} catch (error) {
		if (error.name === "AbortError") {
			console.error(`${service.name} 请求超时`);
		} else {
			console.error(`从 ${service.name} 获取DNS信息失败:`, error.message);
		}
		return null;
	}
}

// 更新DNS列表显示
function updateDNSList(dnsData) {
	const dnsListElement = document.getElementById("dns-list");
	if (!dnsListElement) return;

	// 使用DocumentFragment进行批量DOM更新，提高性能
	const fragment = document.createDocumentFragment();

	// 创建容器
	const container = document.createElement("div");
	container.className = "divide-y divide-gray-100";

	// 添加表头
	const headerDiv = document.createElement("div");
	headerDiv.className =
		"grid grid-cols-4 gap-4 py-2 font-medium text-gray-700 text-sm border-b border-gray-200";

	const headers = ["Provider", "ISP", "IP Address", "Location"];
	headers.forEach((headerText) => {
		const headerCell = document.createElement("div");
		headerCell.className = "text-center";
		headerCell.textContent = headerText;
		headerDiv.appendChild(headerCell);
	});

	container.appendChild(headerDiv);

	// 添加新的DNS条目
	dnsData.forEach(({ ip, provider, isp, location }) => {
		const rowDiv = document.createElement("div");
		rowDiv.className = "grid grid-cols-4 gap-4 py-2 text-sm";

		// Provider列
		const providerDiv = document.createElement("div");
		providerDiv.className = "text-center font-medium text-gray-900";
		providerDiv.textContent = provider;

		// ISP列
		const ispDiv = document.createElement("div");
		ispDiv.className = "text-center text-gray-600 truncate";
		ispDiv.title = isp || "Unknown ISP"; // 添加完整文本的tooltip
		ispDiv.textContent = isp || "Unknown ISP";

		// IP列
		const ipDiv = document.createElement("div");
		ipDiv.className = "text-center font-mono text-gray-800";
		ipDiv.textContent = ip;

		// Location列
		const locationDiv = document.createElement("div");
		locationDiv.className = "text-center text-gray-500 truncate";
		locationDiv.title = location || "Unknown Location"; // 添加完整文本的tooltip
		locationDiv.textContent = location || "Unknown Location";

		rowDiv.appendChild(providerDiv);
		rowDiv.appendChild(ispDiv);
		rowDiv.appendChild(ipDiv);
		rowDiv.appendChild(locationDiv);

		container.appendChild(rowDiv);
	});

	fragment.appendChild(container);

	// 清空现有内容并一次性更新DOM
	dnsListElement.innerHTML = "";
	dnsListElement.appendChild(fragment);
}

// 运行DNS查询的主函数
async function runDNSQueries() {
	const dnsData = [];
	const maxResults = MAX_DNS_RESULTS;

	// 用于避免过于频繁的DOM更新
	let updateTimer = null;

	const updateDisplay = () => {
		if (updateTimer) clearTimeout(updateTimer);
		updateTimer = setTimeout(() => {
			updateDNSList([...dnsData]);
		}, UPDATE_DELAY_MS); // 延迟更新以避免过于频繁的DOM更新
	};

	// 并发运行所有DNS服务查询
	const promises = DNS_SERVICES.map(async (service) => {
		let attempts = 0;
		const maxAttempts =
			service.name === "AliYun" ? MAX_ATTEMPTS_ALIYUN : MAX_ATTEMPTS_DEFAULT;

		while (attempts < maxAttempts && dnsData.length < maxResults) {
			const result = await fetchDNSInfo(service);
			if (result) {
				let addedNew = false;
				if (Array.isArray(result)) {
					// Surfshark 返回数组
					for (const item of result) {
						if (
							dnsData.length < maxResults &&
							!dnsData.some((d) => d.ip === item.ip)
						) {
							dnsData.push(item);
							addedNew = true;
						}
					}
				} else {
					// 其他服务返回单个对象
					if (result && !dnsData.some((d) => d.ip === result.ip)) {
						dnsData.push(result);
						addedNew = true;
					}
				}

				// 如果添加了新数据，立即更新显示
				if (addedNew) {
					updateDisplay();
				}
			}
			attempts++;

			// 小延迟避免过于频繁的请求
			await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
		}
	});

	await Promise.all(promises);

	// 确保最终更新
	if (updateTimer) {
		clearTimeout(updateTimer);
	}
	updateDNSList(dnsData);
}

// 页面加载完成后运行DNS查询
window.addEventListener("DOMContentLoaded", runDNSQueries);
