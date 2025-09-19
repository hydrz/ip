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
const applyPrivacySettings = (service, data) => {
	const displayIP = privacyState.hideIP ? generateRandomIP() : data.ip;
	const displayAddr =
		privacyState.hideAllGeo || (privacyState.hideDomesticGeo && service.isDomestic)
			? generateRandomAddress(service.isDomestic)
			: data.addr;
	return { displayIP, displayAddr };
};

const isDev = window.location.hostname === "localhost" || window.location.hostname === "";

// IP services list
const IP_SERVICES = [
	{
		name: "ip.hydrz.cn",
		isDomestic: true,
		fetch: createSafeFetch("ip.hydrz.cn", async ({ signal } = {}) => {
			if (isDev) {
				return {
					ip: "1.1.1.1",
					addr: "测试地址",
					region_code: "00",
					lon: "0",
					lat: "0",
					postal_code: "000000",
					asn: "AS13335 Cloudflare, Inc.",
					edgeColo: "HKG",
					edgeIp: "0.0.0.0",
					ts: 123,
				};
			}

			const start = Date.now();
			const response = await fetch("https://ip.hydrz.cn/", {
				method: "HEAD",
				signal,
				referrerPolicy: "no-referrer",
				credentials: "omit",
			});
			if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			const ip = response.headers.get("x-client-ip") || "-";
			const geo = response.headers.get("x-client-geo") || "";
			const asn = response.headers.get("x-client-asn") || "";
			const edgeColo = response.headers.get("x-edge-colo") || "";
			const edgeIp = response.headers.get("x-edge-ip") || "";
			const ts = Date.now() - start;
			const [continent, country, region, city, lon, lat, postal_code, region_code] = geo
				.split(",")
				.map((v) => v.trim());
			const addrParts = [continent, country, region, city].filter(Boolean);
			const addr = addrParts.length > 0 ? addrParts.join(" ") : "-";

			return {
				ip,
				addr,
				region_code,
				lon,
				lat,
				postal_code,
				asn,
				edgeColo,
				edgeIp,
				ts,
			};
		}),
	},
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
	asnSelector: `#ip-table [data-provider="${service.name}"] [data-label="ASN"]`,
	edgeColoSelector: `#ip-table [data-provider="${service.name}"] [data-label="站点节点"]`,
	edgeIpSelector: `#ip-table [data-provider="${service.name}"] [data-label="站点IP"]`,
	tsSelector: `#ip-table [data-provider="${service.name}"] [data-label="响应时间"]`,
});

// Store original data in DOM elements
const storeOriginalData = (service, data) => {
	const { ipSelector, addrSelector } = getServiceSelectors(service);
	const ipCell = cachedQuery(ipSelector);
	const addrCell = cachedQuery(addrSelector);
	if (ipCell) ipCell.dataset.originalIp = data.ip;
	if (addrCell) addrCell.dataset.originalAddr = data.addr;
};

// Filter services that have corresponding DOM elements
const getRenderedServices = () =>
	IP_SERVICES.filter((service) => cachedQuery(`#ip-table [data-provider="${service.name}"]`));

// Update service result with privacy settings applied
const updateServiceResult = (service, data) => {
	const { displayIP, displayAddr } = applyPrivacySettings(service, data);
	const { ipSelector, addrSelector, asnSelector, edgeColoSelector, edgeIpSelector, tsSelector } =
		getServiceSelectors(service);

	updateElement(ipSelector, displayIP);
	updateElement(addrSelector, displayAddr);

	if (data.asn && asnSelector) updateElement(asnSelector, data.asn);
	if (data.edgeColo && edgeColoSelector) updateElement(edgeColoSelector, data.edgeColo);
	if (data.edgeIp && edgeIpSelector) updateElement(edgeIpSelector, data.edgeIp);
	if (data.ts && tsSelector) updateElement(tsSelector, data.ts);
};

// Fetch IP data from all services
const fetchIpData = async () => {
	const servicesToFetch = getRenderedServices();
	await Promise.all(
		servicesToFetch.map(async (service) => {
			try {
				const data = await service.fetch();
				storeOriginalData(service, data);
				updateServiceResult(service, data);
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
			const { displayIP, displayAddr } = applyPrivacySettings(service, { ip: originalIP, addr: originalAddr });

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
