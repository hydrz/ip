import { cachedQuery, updateElement } from "./lib/dom";
import { jsonpRequest } from "./lib/jsonp.js";
import { generateRandomAddress, generateRandomIP } from "./lib/random";
import { MESSAGES } from "./lib/ui.js";
import { createSafeFetch, safeParseJson } from "./lib/utils.js";

// Privacy state
const privacyState = {
	hideIP: false,
	hideDomesticGeo: false,
	hideAllGeo: false,
};

// Apply privacy settings
const applyPrivacySettings = (service, originalIP, originalAddr) => {
	const displayIP = privacyState.hideIP ? generateRandomIP() : originalIP;
	const displayAddr =
		privacyState.hideAllGeo || (privacyState.hideDomesticGeo && service.isDomestic)
			? generateRandomAddress(service.isDomestic)
			: originalAddr;
	return { displayIP, displayAddr };
};

// IP services list
const IP_SERVICES = [
	{
		name: "itdog",
		isDomestic: true,
		fetch: createSafeFetch("itdog.cn", async ({ signal } = {}) => {
			const response = await fetch("https://ipv4_cm.itdog.cn/", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const parsed = typeof data === "string" ? JSON.parse(data) : data;
			const { ip = "-", address: addr = "-" } = parsed || {};
			return { ip, addr };
		}),
	},
	{
		name: "edgeone",
		isDomestic: true,
		fetch: createSafeFetch("edgeone.run", async ({ signal } = {}) => {
			const response = await fetch("https://functions-geolocation.edgeone.run/geo", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { eo: { geo: { countryName, regionName, cityName, cisp } = {}, clientIp: ip = "-" } = {} } = data || {};
			const addr =
				[countryName, regionName, cityName, cisp]
					.filter(Boolean)
					.filter((v) => v !== "Unknown")
					.join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "tencent",
		isDomestic: true,
		fetch: createSafeFetch("腾讯新闻", async ({ signal } = {}) => {
			const urlFor = (cb) => `https://r.inews.qq.com/api/ip2city?otype=jsonp&callback=${cb}`;
			const callbackName = `__jsonp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}__`;
			const data = await jsonpRequest({
				urlForCallback: urlFor,
				namespace: callbackName,
				signal,
			});
			const { ip = "-", country, province, city } = data || {};
			const addr = [country, province, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "speedtest",
		isDomestic: true,
		fetch: createSafeFetch("speedtest.cn", async ({ signal } = {}) => {
			const response = await fetch("https://api-v3.speedtest.cn/ip", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { code, data: inner } = data || {};
			if (code !== 0 || !inner) throw new Error("Invalid response data");
			const { ip = "-", country, province, city, isp } = inner;
			const addr = [country, province, city, isp].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "tencent",
		isDomestic: true,
		fetch: createSafeFetch("腾讯新闻", async ({ signal } = {}) => {
			const urlFor = (cb) => `https://r.inews.qq.com/api/ip2city?otype=jsonp&callback=${cb}`;
			const data = await jsonpRequest({
				urlForCallback: urlFor,
				namespace: "__tencent_jsonp_callbacks__",
				signal,
			});
			const { ip = "-", country, province, city } = data || {};
			const addr = [country, province, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "speedtest",
		isDomestic: true,
		fetch: createSafeFetch("speedtest.cn", async ({ signal } = {}) => {
			const response = await fetch("https://api-v3.speedtest.cn/ip", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { code, data: inner } = data || {};
			if (code !== 0 || !inner) return { ip: "获取失败", addr: "" };
			const { ip = "-", country, province, city, isp } = inner;
			const addr = [country, province, city, isp].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "cloudflare",
		fetch: createSafeFetch("Cloudflare", async ({ signal } = {}) => {
			const response = await fetch("https://cloudflare.com/cdn-cgi/trace", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const text = await response.text();
			const ipMatch = text.match(/ip=(.+)/);
			const locMatch = text.match(/loc=(.+)/);
			return {
				ip: ipMatch ? ipMatch[1] : "-",
				addr: locMatch ? locMatch[1] : "-",
			};
		}),
	},
	{
		name: "ipsb",
		fetch: createSafeFetch("IP.SB", async ({ signal } = {}) => {
			const response = await fetch("https://api.ip.sb/geoip", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { ip = "-", country, region, city } = data || {};
			const addr = [country, region, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "ipapi",
		fetch: createSafeFetch("ip-api.com", async ({ signal } = {}) => {
			const response = await fetch("https://pro.ip-api.com/json/?fields=16985625&key=EEKS6bLi6D91G1p", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { query: ip = "-", country, regionName, city } = data || {};
			const addr = [country, regionName, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "ipinfo",
		fetch: createSafeFetch("IPInfo.io", async ({ signal } = {}) => {
			const response = await fetch("https://ipinfo.io/json?token=41c48b54f6d78f", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { ip = "-", city, region, country } = data || {};
			const addr = [country, region, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "ipsb",
		fetch: createSafeFetch("IP.SB", async ({ signal } = {}) => {
			const response = await fetch("https://api.ip.sb/geoip", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { ip = "-", country, region, city } = data || {};
			const addr = [country, region, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "ipapi",
		fetch: createSafeFetch("ip-api.com", async ({ signal } = {}) => {
			const response = await fetch("https://pro.ip-api.com/json/?fields=16985625&key=EEKS6bLi6D91G1p", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { query: ip = "-", country, regionName, city } = data || {};
			const addr = [country, regionName, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "ipinfo",
		fetch: createSafeFetch("IPInfo.io", async ({ signal } = {}) => {
			const response = await fetch("https://ipinfo.io/json?token=41c48b54f6d78f", {
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const data = await safeParseJson(response);
			const { ip = "-", country, region, city } = data || {};
			const addr = [country, region, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
];

// Get element selectors for service
const getServiceSelectors = (service) => ({
	ipSelector: `#ip-table [data-provider="${service.name}"] [data-label="IP地址"]`,
	addrSelector: `#ip-table [data-provider="${service.name}"] [data-label="位置"]`,
});

// Store original data in DOM elements
const storeOriginalData = (service, ip, addr) => {
	const { ipSelector, addrSelector } = getServiceSelectors(service);
	const ipCell = cachedQuery(ipSelector);
	const addrCell = cachedQuery(addrSelector);
	if (ipCell) ipCell.dataset.originalIp = ip;
	if (addrCell) addrCell.dataset.originalAddr = addr;
};

// Filter services that have corresponding DOM elements
const getRenderedServices = () =>
	IP_SERVICES.filter((service) => cachedQuery(`#ip-table [data-provider="${service.name}"]`));

// Update service result with privacy settings applied
const updateServiceResult = (service, ip, addr) => {
	const { displayIP, displayAddr } = applyPrivacySettings(service, ip, addr);
	const { ipSelector, addrSelector } = getServiceSelectors(service);

	updateElement(ipSelector, displayIP);
	updateElement(addrSelector, displayAddr);
};

// Fetch IP data from all services
const fetchIpData = async () => {
	const servicesToFetch = getRenderedServices();
	await Promise.all(
		servicesToFetch.map(async (service) => {
			try {
				const { ip, addr } = await service.fetch();
				storeOriginalData(service, ip, addr);
				updateServiceResult(service, ip, addr);
			} catch (error) {
				console.error(`Unexpected error for ${service.name}:`, error.message);
				updateServiceResult(service, MESSAGES.ERROR, "");
			}
		}),
	);
};

// Update all IP displays with current privacy settings
const updateAllDisplays = () => {
	const servicesToUpdate = getRenderedServices();
	servicesToUpdate.forEach((service) => {
		const { ipSelector, addrSelector } = getServiceSelectors(service);
		const ipCell = cachedQuery(ipSelector);
		const addrCell = cachedQuery(addrSelector);

		if (ipCell && addrCell) {
			const originalIP = ipCell.dataset.originalIp || ipCell.textContent;
			const originalAddr = addrCell.dataset.originalAddr || addrCell.textContent;
			const { displayIP, displayAddr } = applyPrivacySettings(service, originalIP, originalAddr);

			updateElement(ipSelector, displayIP);
			updateElement(addrSelector, displayAddr);
		}
	});
};

// Initialize privacy toggle listeners
const initToggleListeners = () => {
	const toggleConfigs = [
		{
			id: "hide-ip-toggle",
			handler: (checked) => {
				privacyState.hideIP = checked;
			},
		},
		{
			id: "hide-domestic-geo-toggle",
			handler: (checked) => {
				privacyState.hideDomesticGeo = checked;
			},
		},
		{
			id: "hide-all-geo-toggle",
			handler: (checked) => {
				privacyState.hideAllGeo = checked;
			},
		},
	];

	toggleConfigs.forEach(({ id, handler }) => {
		const toggle = cachedQuery(`#${id}`);
		if (toggle) {
			toggle.addEventListener("change", (e) => {
				handler(e.target.checked);
				updateAllDisplays();
			});
		}
	});
};

// Initialize tooltip functionality
const initTooltip = () => {
	const tooltipTrigger = cachedQuery('[data-tooltip-target="tooltip-default"]');
	const tooltip = cachedQuery("#tooltip-default");

	if (tooltipTrigger && tooltip) {
		tooltipTrigger.addEventListener("mouseenter", () => {
			tooltip.classList.remove("invisible", "opacity-0");
			tooltip.classList.add("opacity-100");
		});
		tooltipTrigger.addEventListener("mouseleave", () => {
			tooltip.classList.add("invisible", "opacity-0");
			tooltip.classList.remove("opacity-100");
		});
	}
};

// Initialize application
window.addEventListener("DOMContentLoaded", () => {
	initToggleListeners();
	initTooltip();
	fetchIpData();
});
