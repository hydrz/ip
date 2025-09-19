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
		document.body.innerHTML = `
        <div><strong>ip:</strong> ${data.ip}</div>
        <div><strong>asn:</strong> ${data.asn}</div>
        <div><strong>continent:</strong> ${data.continent}</div>
        <div><strong>country:</strong> ${data.country}</div>
        <div><strong>region:</strong> ${data.region}</div>
        <div><strong>region_code:</strong> ${data.region_code}</div>
        <div><strong>city:</strong> ${data.city}</div>
        <div><strong>lon:</strong> ${data.lon}</div>
        <div><strong>lat:</strong> ${data.lat}</div>
        <div><strong>postal_code:</strong> ${data.postal_code}</div>
        <div><strong>edgeIP:</strong> ${data.edgeIP}</div>
        <div><strong>edgeColo:</strong> ${data.edgeColo}</div>
        <div><strong>ts:</strong> ${data.ts}ms</div>
    `;
	} catch (error) {
		document.body.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
	}
});
