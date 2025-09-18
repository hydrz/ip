// Constants
const JSONP_TIMEOUT = 10000;

// Privacy settings
let hideIP = false;
let hideDomesticGeo = false;
let hideAllGeo = false;

// Domestic province-city mapping
const PROVINCE_CITY_MAP = {
	北京: ["北京市"],
	上海: ["上海市"],
	广东: ["广州市", "深圳市"],
	浙江: ["杭州市"],
	四川: ["成都市"],
	湖北: ["武汉市"],
	江苏: ["南京市"],
};

// Domestic ISP list
const DOMESTIC_ISP_LIST = ["电信", "联通", "移动", "广电", "铁通"];

// Foreign country-city mapping
const COUNTRY_CITY_MAP = {
	USA: ["New York", "Los Angeles", "San Francisco", "Chicago"],
	UK: ["London", "Manchester", "Birmingham"],
	Japan: ["Tokyo", "Osaka", "Kyoto"],
	Germany: ["Berlin", "Munich", "Frankfurt"],
	France: ["Paris", "Marseille", "Lyon"],
	Canada: ["Toronto", "Vancouver", "Montreal"],
	Australia: ["Sydney", "Melbourne", "Brisbane"],
};

// Foreign ISP list
const FOREIGN_ISP_LIST = ["AT&T", "Verizon", "BT", "NTT", "Deutsche Telekom", "Orange", "Bell", "Telstra"];

// Utility functions
const generateRandomIP = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
// Generate a random address, supporting both domestic and foreign
const generateRandomAddress = (isDomestic) => {
	if (isDomestic) {
		const provinces = Object.keys(PROVINCE_CITY_MAP);
		const province = provinces[Math.floor(Math.random() * provinces.length)];
		const cities = PROVINCE_CITY_MAP[province];
		const city = cities[Math.floor(Math.random() * cities.length)];
		const isp = DOMESTIC_ISP_LIST[Math.floor(Math.random() * DOMESTIC_ISP_LIST.length)];
		return `${province} ${city} ${isp}`;
	}
	const countries = Object.keys(COUNTRY_CITY_MAP);
	const country = countries[Math.floor(Math.random() * countries.length)];
	const cities = COUNTRY_CITY_MAP[country];
	const city = cities[Math.floor(Math.random() * cities.length)];
	const isp = FOREIGN_ISP_LIST[Math.floor(Math.random() * FOREIGN_ISP_LIST.length)];
	return `${country} ${city} ${isp}`;
};

// Safe fetch wrapper with retries
const safeFetch =
	(serviceName, fetchFn, retries = 3) =>
	async () => {
		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
				return await fetchFn();
			} catch (error) {
				console.error(`${serviceName} error on attempt ${attempt}:`, error.message);
				if (attempt === retries) return { ip: "获取失败", addr: "" };
				await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
			}
		}
	};

// Fetch JSON with error handling
const fetchJson = async (url) => {
	const response = await fetch(url, {
		referrerPolicy: "no-referrer",
		credentials: "omit",
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	const contentType = response.headers.get("content-type");
	return contentType?.includes("application/json") ? await response.json() : await response.text();
};

// Apply privacy settings
const applyPrivacySettings = (service, originalIP, originalAddr) => {
	const displayIP = hideIP ? generateRandomIP() : originalIP;
	const displayAddr =
		hideAllGeo || (hideDomesticGeo && service.isDomestic) ? generateRandomAddress(service.isDomestic) : originalAddr;
	return { displayIP, displayAddr };
};

// IP services list
const IP_SERVICES = [
	{
		name: "itdog",
		isDomestic: true,
		fetch: safeFetch("itdog.cn", async () => {
			const data = await fetchJson("https://ipv4_cm.itdog.cn/");
			const { ip = "-", address: addr = "-" } = JSON.parse(data);
			return { ip, addr };
		}),
	},
	{
		name: "edgeone",
		isDomestic: true,
		fetch: safeFetch("edgeone.run", async () => {
			const data = await fetchJson("https://functions-geolocation.edgeone.run/geo");
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
		fetch: safeFetch("腾讯新闻", async () => {
			const result = await new Promise((resolve, reject) => {
				const callbackName = `__jsonp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}__`;
				const script = document.createElement("script");
				const cleanup = () => {
					script.remove();
					delete window[callbackName];
				};
				const timeout = setTimeout(() => {
					cleanup();
					reject(new Error("JSONP request timeout"));
				}, JSONP_TIMEOUT);
				window[callbackName] = (data) => {
					clearTimeout(timeout);
					cleanup();
					resolve(data);
				};
				script.src = `https://r.inews.qq.com/api/ip2city?otype=jsonp&callback=${callbackName}`;
				script.onerror = () => {
					clearTimeout(timeout);
					cleanup();
					reject(new Error("JSONP script load error"));
				};
				document.head.appendChild(script);
			});
			const { ip = "-", country, province, city } = result;
			const addr = [country, province, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "speedtest",
		isDomestic: true,
		fetch: safeFetch("speedtest.cn", async () => {
			const response = await fetchJson("https://api-v3.speedtest.cn/ip");
			const { code, data } = response;
			if (code !== 0 || !data) return { ip: "获取失败", addr: "" };
			const { ip = "-", country, province, city, isp } = data;
			const addr = [country, province, city, isp].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "cloudflare",
		fetch: safeFetch("Cloudflare", async () => {
			const response = await fetch("https://cloudflare.com/cdn-cgi/trace", {
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
		fetch: safeFetch("IP.SB", async () => {
			const data = await fetchJson("https://api.ip.sb/geoip");
			const { ip = "-", country, region, city } = data;
			const addr = [country, region, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "ipapi",
		fetch: safeFetch("ip-api.com", async () => {
			const data = await fetchJson("https://pro.ip-api.com/json/?fields=16985625&key=EEKS6bLi6D91G1p");
			const { query: ip = "-", country, regionName, city } = data;
			const addr = [country, regionName, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "ipinfo",
		fetch: safeFetch("IPInfo.io", async () => {
			const data = await fetchJson("https://ipinfo.io/json?token=41c48b54f6d78f");
			const { ip = "-", country, region, city } = data;
			const addr = [country, region, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
];

// Get element IDs for service
const serviceElementIDs = (service) => ({
	ipID: `ip-${service.name}-ip`,
	addrID: `ip-${service.name}-addr`,
});

// Store original data in DOM
const storeOriginalData = (service, ip, addr) => {
	const { ipID, addrID } = serviceElementIDs(service);
	const ipCell = document.getElementById(ipID);
	const addrCell = document.getElementById(addrID);
	if (ipCell) ipCell.dataset.originalIp = ip;
	if (addrCell) addrCell.dataset.originalAddr = addr;
};

// Fill result with privacy applied
const fillResult = (service, ip, addr) => {
	const { displayIP, displayAddr } = applyPrivacySettings(service, ip, addr);
	const { ipID, addrID } = serviceElementIDs(service);
	const ipCell = document.getElementById(ipID);
	const addrCell = document.getElementById(addrID);
	if (ipCell) ipCell.textContent = displayIP;
	if (addrCell) addrCell.textContent = displayAddr;
};

// Fetch IP data
const fetchIpData = async () => {
	await Promise.all(
		IP_SERVICES.map(async (service) => {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 5000);
				const { ip, addr } = await service.fetch();
				clearTimeout(timeoutId);
				storeOriginalData(service, ip, addr);
				fillResult(service, ip, addr);
			} catch (error) {
				console.error(`Unexpected error for ${service.name}:`, error.message);
				fillResult(service, "网络错误，请重试", "");
			}
		}),
	);
};

// Update all displays
const updateAllDisplays = () => {
	IP_SERVICES.forEach((service) => {
		const { ipID, addrID } = serviceElementIDs(service);
		const ipCell = document.getElementById(ipID);
		const addrCell = document.getElementById(addrID);
		if (ipCell && addrCell) {
			const originalIP = ipCell.dataset.originalIp || ipCell.textContent;
			const originalAddr = addrCell.dataset.originalAddr || addrCell.textContent;
			const { displayIP, displayAddr } = applyPrivacySettings(service, originalIP, originalAddr);
			ipCell.textContent = displayIP;
			addrCell.textContent = displayAddr;
		}
	});
};

// Initialize toggle listeners
const initToggleListeners = () => {
	[
		{
			id: "hide-ip-toggle",
			handler: (checked) => {
				hideIP = checked;
			},
		},
		{
			id: "hide-domestic-geo-toggle",
			handler: (checked) => {
				hideDomesticGeo = checked;
			},
		},
		{
			id: "hide-all-geo-toggle",
			handler: (checked) => {
				hideAllGeo = checked;
			},
		},
	].forEach(({ id, handler }) => {
		const toggle = document.getElementById(id);
		if (toggle) {
			toggle.addEventListener("change", (e) => {
				handler(e.target.checked);
				updateAllDisplays();
			});
		}
	});
};

// Initialize tooltip
const initTooltip = () => {
	const tooltipTrigger = document.querySelector('[data-tooltip-target="tooltip-default"]');
	const tooltip = document.getElementById("tooltip-default");
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

window.addEventListener("DOMContentLoaded", () => {
	initToggleListeners();
	initTooltip();
	fetchIpData();
});
