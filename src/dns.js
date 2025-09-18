// DNS egress query
const MAX_DNS_RESULTS = 8;
const UPDATE_DELAY_MS = 100;
const REQUEST_DELAY_MS = 200;
const MAX_ATTEMPTS_DEFAULT = 5;

// DNS 服务配置数组
const DNS_SERVICES = [
	{
		name: "Fastly",
		url: (timestamp, random) => `https://${timestamp}-${random}.u.fastly-analytics.com/debug_resolver`,
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
		url: (timestamp, random) => `https://${timestamp}-${random}--hydrz.edns.ip-api.com/json`,
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

// Generate random ID
const generateRandomId = (length = 15) =>
	Math.random()
		.toString(36)
		.slice(2, 2 + length);

// Fetch DNS info with retries
const fetchDNSInfo = async (service, retries = 3) => {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);
			const timestamp = Date.now();
			const random = generateRandomId();
			const url = service.name === "Surfshark" ? service.url(random) : service.url(timestamp, random);
			const response = await fetch(url, {
				signal: controller.signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			clearTimeout(timeoutId);
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await response.json();
			const result = service.parse(data);
			if (!result) console.warn(`${service.name} returned unparseable data`);
			return result;
		} catch (error) {
			console.error(`Failed to fetch DNS from ${service.name}:`, error.message);
			if (attempt === retries) return null;
			await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
		}
	}
};

// Update DNS list with fragment
const updateDNSList = (dnsData) => {
	const dnsDataElement = document.getElementById("dns-data");
	if (!dnsDataElement) return;
	const fragment = document.createDocumentFragment();
	dnsData.forEach(({ ip, provider, isp, location }) => {
		const rowDiv = document.createElement("div");
		rowDiv.className = "table-row dns-row";

		const providerDiv = document.createElement("div");
		providerDiv.setAttribute("data-label", "服务商");
		providerDiv.className = "table-cell text-title";
		providerDiv.textContent = provider;
		const ispSpan = document.createElement("span");
		ispSpan.className = "text-subtitle";
		ispSpan.textContent = ` ${isp?.trim() || "Unknown ISP"}`;
		providerDiv.appendChild(ispSpan);
		providerDiv.title = `${provider} - ${isp?.trim() || "Unknown ISP"}`;

		rowDiv.appendChild(providerDiv);

		const ipDiv = document.createElement("div");
		ipDiv.setAttribute("data-label", "IP地址");
		ipDiv.className = "table-cell text-mono";
		ipDiv.textContent = ip;
		ipDiv.title = ip;
		rowDiv.appendChild(ipDiv);

		const locationDiv = document.createElement("div");
		locationDiv.setAttribute("data-label", "位置");
		locationDiv.className = "table-cell text-meta";
		locationDiv.textContent = location || "Unknown Location";
		locationDiv.title = location || "Unknown Location";
		rowDiv.appendChild(locationDiv);

		fragment.appendChild(rowDiv);
	});
	dnsDataElement.innerHTML = "";
	dnsDataElement.appendChild(fragment);
};

// Run DNS queries
const runDNSQueries = async () => {
	const dnsData = [];
	let updateTimer = null;
	const updateDisplay = () => {
		if (updateTimer) clearTimeout(updateTimer);
		updateTimer = setTimeout(() => updateDNSList([...dnsData]), UPDATE_DELAY_MS);
	};
	const promises = DNS_SERVICES.map(async (service) => {
		let attempts = 0;
		while (attempts < MAX_ATTEMPTS_DEFAULT && dnsData.length < MAX_DNS_RESULTS) {
			const result = await fetchDNSInfo(service);
			if (result) {
				const added = Array.isArray(result)
					? result.filter((item) => !dnsData.some((d) => d.ip === item.ip))
					: [result].filter((item) => !dnsData.some((d) => d.ip === item.ip));
				dnsData.push(...added);
				if (added.length > 0) updateDisplay();
			}
			attempts++;
			await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
		}
	});
	await Promise.all(promises);
	if (updateTimer) clearTimeout(updateTimer);
	updateDNSList(dnsData);
};

window.addEventListener("DOMContentLoaded", runDNSQueries);
