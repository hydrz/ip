// 常量配置
const DOMESTIC_SERVICES = ["itdog.cn", "IPIP.net", "腾讯新闻", "speedtest.cn"];

const CITIES = [
	"北京市",
	"上海市",
	"广州市",
	"深圳市",
	"杭州市",
	"成都市",
	"武汉市",
	"南京市",
];

const PROVINCES = ["北京", "上海", "广东", "浙江", "四川", "湖北", "江苏"];

const JSONP_TIMEOUT = 10000;

// 隐藏状态管理
let hideIP = false;
let hideDomesticGeo = false;
let hideAllGeo = false;

// 工具函数
const isDomesticService = (serviceName) =>
	DOMESTIC_SERVICES.includes(serviceName);

const generateRandomIP = () =>
	Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");

const generateRandomAddress = () => {
	const randomCity = CITIES[Math.floor(Math.random() * CITIES.length)];
	const randomProvince =
		PROVINCES[Math.floor(Math.random() * PROVINCES.length)];
	return `${randomProvince} ${randomCity}`;
};

// 创建安全的fetch包装器
const safeFetch = (serviceName, fetchFn) => async () => {
	try {
		return await fetchFn();
	} catch (error) {
		console.error(`${serviceName} fetch error:`, error);
		return { ip: "获取失败", addr: "" };
	}
};

// 通用fetch函数
const fetchJson = async (url) => {
	const response = await fetch(url, {
		referrerPolicy: 'no-referrer',
		credentials: 'omit'
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const contentType = response.headers.get('content-type');
	if (contentType?.includes('application/json')) {
		return await response.json();
	} else {
		return await response.text();
	}
};

// 应用隐藏设置
const applyPrivacySettings = (service, originalIP, originalAddr) => {
	let displayIP = originalIP;
	let displayAddr = originalAddr;

	// 隐藏IP
	if (hideIP) {
		displayIP = generateRandomIP();
	}

	// 隐藏地理位置
	if (hideAllGeo) {
		displayAddr = generateRandomAddress();
	} else if (hideDomesticGeo && isDomesticService(service.name)) {
		displayAddr = generateRandomAddress();
	}

	return { displayIP, displayAddr };
};

// IP 服务列表
const IP_SERVICES = [
	{
		name: "ipv4.itdog.cn",
		ipId: "ip-itdog-ipv4-ip",
		addrId: "ip-itdog-ipv4-addr",
		fetch: safeFetch("itdog.cn", async () => {
			const data = await fetchJson("https://ipv4_cm.itdog.cn/");
			const { ip = "-", address: addr = "-" } = JSON.parse(data);
			return { ip, addr };
		}),
	},
	{
		name: "ipv6.itdog.cn",
		ipId: "ip-itdog-ipv6-ip",
		addrId: "ip-itdog-ipv6-addr",
		fetch: safeFetch("itdog.cn", async () => {
			const data = await fetchJson("https://ipv6_cm.itdog.cn/");
			const { ip = "-", address: addr = "-" } = JSON.parse(data);
			return { ip, addr };
		}),
	},
	{
		name: "腾讯新闻",
		ipId: "ip-tencent-ip",
		addrId: "ip-tencent-addr",
		fetch: safeFetch("腾讯新闻", async () => {
			// 腾讯新闻使用JSONP，直接在主线程处理
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
		name: "speedtest.cn",
		ipId: "ip-speedtest-ip",
		addrId: "ip-speedtest-addr",
		fetch: safeFetch("speedtest.cn", async () => {
			const response = await fetchJson("https://api-v3.speedtest.cn/ip");
			const { code, data } = response;
			if (code !== 0 || !data) return { ip: "获取失败", addr: "" };
			const { ip = "-", country, province, city, isp } = data;
			const addr =
				[country, province, city, isp].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "Cloudflare",
		ipId: "ip-cloudflare-ip",
		addrId: "ip-cloudflare-addr",
		fetch: safeFetch("Cloudflare", async () => {
			const response = await fetch("https://cloudflare.com/cdn-cgi/trace", {
				referrerPolicy: 'no-referrer',
				credentials: 'omit'
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

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
		name: "IP.SB",
		ipId: "ip-ipsb-ip",
		addrId: "ip-ipsb-addr",
		fetch: safeFetch("IP.SB", async () => {
			const data = await fetchJson("https://api.ip.sb/geoip");
			const { ip = "-", country, region, city } = data;
			const addr = [country, region, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "ip-api.com",
		ipId: "ip-ipapi-ip",
		addrId: "ip-ipapi-addr",
		fetch: safeFetch("ip-api.com", async () => {
			const data = await fetchJson("https://pro.ip-api.com/json/?fields=16985625&key=EEKS6bLi6D91G1p");
			const { query: ip = "-", country, regionName, city } = data;
			const addr = [country, regionName, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
	{
		name: "IPInfo.io",
		ipId: "ip-ipinfo-ip",
		addrId: "ip-ipinfo-addr",
		fetch: safeFetch("IPInfo.io", async () => {
			const data = await fetchJson("https://ipinfo.io/json?token=41c48b54f6d78f");
			const { ip = "-", country, region, city } = data;
			const addr = [country, region, city].filter(Boolean).join(" ") || "-";
			return { ip, addr };
		}),
	},
];

// 填充 IP 和地址
const fillResult = (service, ip, addr) => {
	const { displayIP, displayAddr } = applyPrivacySettings(service, ip, addr);
	const ipCell = document.getElementById(service.ipId);
	const addrCell = document.getElementById(service.addrId);
	if (ipCell) ipCell.textContent = displayIP;
	if (addrCell) addrCell.textContent = displayAddr;
};

// 获取 IP 和地址并填充
const fetchIpData = async () => {
	for (const service of IP_SERVICES) {
		try {
			const { ip, addr } = await service.fetch();
			storeOriginalData(service, ip, addr);
			fillResult(service, ip, addr);
		} catch (error) {
			// safeFetch已经处理了错误，这里不需要额外处理
			console.error(`Unexpected error for ${service.name}:`, error);
		}
	}
};

// 更新所有IP显示
const updateAllDisplays = () => {
	for (const service of IP_SERVICES) {
		const ipCell = document.getElementById(service.ipId);
		const addrCell = document.getElementById(service.addrId);
		if (ipCell && addrCell) {
			const originalIP = ipCell.dataset.originalIp || ipCell.textContent;
			const originalAddr =
				addrCell.dataset.originalAddr || addrCell.textContent;
			const { displayIP, displayAddr } = applyPrivacySettings(
				service,
				originalIP,
				originalAddr,
			);
			ipCell.textContent = displayIP;
			addrCell.textContent = displayAddr;
		}
	}
};

// 初始化开关事件监听器
const initToggleListeners = () => {
	const toggles = [
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
	];

	toggles.forEach(({ id, handler }) => {
		const toggle = document.getElementById(id);
		if (toggle) {
			toggle.addEventListener("change", (e) => {
				handler(e.target.checked);
				updateAllDisplays();
			});
		}
	});
};

// 初始化 tooltip
const initTooltip = () => {
	const tooltipTrigger = document.querySelector(
		'[data-tooltip-target="tooltip-default"]',
	);
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

// 存储原始数据
const storeOriginalData = (service, ip, addr) => {
	const ipCell = document.getElementById(service.ipId);
	const addrCell = document.getElementById(service.addrId);
	if (ipCell) ipCell.dataset.originalIp = ip;
	if (addrCell) addrCell.dataset.originalAddr = addr;
};

window.addEventListener("DOMContentLoaded", () => {
	initToggleListeners();
	initTooltip();
	fetchIpData();
});
