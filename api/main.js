const url = "https://ip.hydrz.cn";

let cachedData = null;

const fetchData = async () => {
	if (cachedData) return cachedData;

	try {
		const start = performance.now();
		const response = await fetch(url, { method: "HEAD" });
		if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		const headers = response.headers;
		const ip = headers.get("x-client-ip") || "Unknown";
		const asn = headers.get("x-client-asn") || "Unknown";
		const edgeIP = headers.get("x-edge-ip") || "Unknown";
		const edgeColo = headers.get("x-edge-colo") || "Unknown";

		const geo = headers.get("x-client-geo") || "Unknown";
		const [continent, country, region, city, lon, lat, postal_code, region_code] = geo.split(",");

		cachedData = {
			ip,
			asn,
			continent,
			country,
			region,
			region_code,
			city,
			lon,
			lat,
			postal_code,
			edgeIP,
			edgeColo,
			ts: (performance.now() - start).toFixed(2),
		};
		return cachedData;
	} catch (error) {
		throw new Error(`Fetch error: ${error.message}`);
	}
};

window.addEventListener("message", async (event) => {
	if (event.data === "ip") {
		const targetOrigin = event.origin || "*";
		try {
			const data = await fetchData();
			event.source.postMessage(data, targetOrigin);
		} catch (error) {
			event.source.postMessage({ error: error.message }, targetOrigin);
		}
	}
});

window.addEventListener("DOMContentLoaded", async () => {
	try {
		const data = await fetchData();
		document.body.innerText = `
ip=${data.ip}
asn=${data.asn}
continent=${data.continent}
country=${data.country}
region=${data.region}
region_code=${data.region_code}
city=${data.city}
lon=${data.lon}
lat=${data.lat}
postal_code=${data.postal_code}
edgeIP=${data.edgeIP}
edgeColo=${data.edgeColo}
ts=${data.ts}ms
    `.trim();
	} catch (error) {
		document.body.innerText = `Error: ${error.message}`;
	}
});
