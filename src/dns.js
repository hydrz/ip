import { createElement } from "./lib/dom.js";
import { jsonpRequest } from "./lib/jsonp.js";
import { randomString } from "./lib/random.js";
import { sleep } from "./lib/utils.js";

const MAX_DNS_RESULTS = 8;
const DNS_UPDATE_DELAY = 100;
const DNS_REQUEST_DELAY = 200;
const DNS_MAX_ATTEMPTS = 5;
const DNS_FETCH_TIMEOUT = 5000;

// DNS services configuration
// Each service returns: { ip, provider, isp, location }
const DNS_SERVICES = [
	{
		name: "Aliyun",
		fetch: async ({ signal } = {}) => {
			const timestamp = Date.now();
			const random = randomString(11);
			const callbackNamespace = "__aliyun_jsonp_callbacks__";
			const urlFor = (cb) =>
				`https://${timestamp}-${random}.dns-detect.alicdn.com/api/detect/DescribeDNSLookup?cb=${cb}`;

			const data = await jsonpRequest({
				urlForCallback: urlFor,
				namespace: callbackNamespace,
				timeout: DNS_FETCH_TIMEOUT,
				signal,
			});

			const ip = data?.content?.ldns;
			if (ip) {
				return {
					ip,
					provider: "AliYun",
					isp: "",
					location: "",
				};
			}
			return null;
		},
	},
	{
		name: "Fastly",
		fetch: async ({ signal } = {}) => {
			const timestamp = Date.now();
			const random = randomString(11);
			const url = `https://${timestamp}-${random}.u.fastly-analytics.com/debug_resolver`;

			const response = await fetch(url, {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

			const data = await response.json();
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
		fetch: async ({ signal } = {}) => {
			const timestamp = Date.now();
			const random = randomString(32 - 1 - timestamp.toString().length);
			const url = `https://${timestamp}-${random}.edns.ip-api.com/json`;

			const response = await fetch(url, {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

			const data = await response.json();
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
		fetch: async ({ signal } = {}) => {
			const random = randomString(11);
			const url = `https://${random}.ipv4.surfsharkdns.com/`;

			const response = await fetch(url, {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

			const data = await response.json();
			const results = [];
			for (const [ip, info] of Object.entries(data)) {
				results.push({
					ip,
					provider: "Shark",
					isp: info.ISP || "",
					location: `${info.Country || ""} ${info.City || ""}`.trim(),
				});
			}
			return results;
		},
	},
];

// Create DNS row element
const createDNSRow = ({ ip, provider, isp, location }) => {
	const rowDiv = createElement("div", {}, "", "table-row dns-row");

	// Provider cell with ISP
	const providerDiv = createElement("div", { "data-label": "服务商" }, provider, "table-cell text-title");
	const ispSpan = createElement("span", {}, ` ${isp?.trim() || MESSAGES.UNKNOWN_ISP}`, "text-subtitle");
	providerDiv.appendChild(ispSpan);
	providerDiv.title = `${provider} - ${isp?.trim() || MESSAGES.UNKNOWN_ISP}`;

	// IP cell
	const ipDiv = createElement("div", { "data-label": "IP地址" }, ip, "table-cell text-mono");
	ipDiv.title = ip;

	// Location cell
	const locationDiv = createElement(
		"div",
		{ "data-label": "位置" },
		location || MESSAGES.UNKNOWN_LOCATION,
		"table-cell text-meta",
	);
	locationDiv.title = location || MESSAGES.UNKNOWN_LOCATION;

	rowDiv.append(providerDiv, ipDiv, locationDiv);
	return rowDiv;
};

// Update DNS list display
const updateDNSList = (dnsData) => {
	const dnsDataElement = document.getElementById("dns-data");
	if (!dnsDataElement) return;

	const fragment = document.createDocumentFragment();
	dnsData.forEach((dnsItem) => {
		fragment.appendChild(createDNSRow(dnsItem));
	});

	dnsDataElement.innerHTML = "";
	dnsDataElement.appendChild(fragment);
};

// Run DNS queries with retry logic
const runDNSQueries = async () => {
	const dnsData = [];
	let updateTimer = null;

	const scheduleUpdate = () => {
		if (updateTimer) clearTimeout(updateTimer);
		updateTimer = setTimeout(() => updateDNSList([...dnsData]), DNS_UPDATE_DELAY);
	};

	const promises = DNS_SERVICES.map(async (service) => {
		let attempts = 0;
		while (attempts < DNS_MAX_ATTEMPTS && dnsData.length < MAX_DNS_RESULTS) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), DNS_FETCH_TIMEOUT);
				const result = await service.fetch({ signal: controller.signal });
				clearTimeout(timeoutId);

				if (result) {
					const resultArray = Array.isArray(result) ? result : [result];
					const newItems = resultArray.filter((item) => !dnsData.some((d) => d.ip === item.ip));

					if (newItems.length > 0) {
						dnsData.push(...newItems);
						scheduleUpdate();
					}
				} else {
					console.warn(`${service.name} returned unparseable data`);
				}
			} catch (error) {
				console.error(`Failed to fetch DNS from ${service.name}:`, error?.message || error);
			}

			attempts += 1;
			if (attempts < DNS_MAX_ATTEMPTS) {
				await sleep(DNS_REQUEST_DELAY);
			}
		}
	});

	await Promise.all(promises);
	if (updateTimer) clearTimeout(updateTimer);
	updateDNSList(dnsData);
};

// Initialize DNS queries on page load
window.addEventListener("DOMContentLoaded", runDNSQueries);
