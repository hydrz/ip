window.addEventListener("message", async (event) => {
	if (event.data === "ip") {
		const targetOrigin = event.origin || "*";
		try {
			const response = await fetch("https://ip.hydrz.cn", { method: "HEAD" });
			if (!response.ok) {
				event.source.postMessage({ error: `HTTP ${response.status}: ${response.statusText}` }, targetOrigin);
			}
			const headers = response.headers;
			const ip = headers.get("x-client-ip") || "Unknown";
			const asn = headers.get("x-client-asn") || "Unknown";
			const cfColo = headers.get("cf-ray") ? headers.get("cf-ray").split("-")[1] : "Unknown";
			const cfIp = headers.get("x-edge-ip") || "Unknown";

			const geo = headers.get("x-client-geo") || "Unknown";
			const [continent, country, region, city, lon, lat, postal_code, region_code] = geo.split(",");

			event.source.postMessage(
				{
					cfColo,
					cfIp,
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
				},
				targetOrigin,
			);
		} catch (error) {
			event.source.postMessage({ error: error.message }, targetOrigin);
		}
	}
});
