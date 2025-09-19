// Cloudflare RUM (Real User Monitoring) Beacon

// UUID generation utilities
const UUID_LOOKUP_TABLE = (() => {
	const table = [];
	for (let i = 0; i < 256; ++i) {
		table[i] = (i + 256).toString(16).substr(1);
	}
	return table;
})();

const bytesToUuid = (bytes, offset = 0) => {
	let i = offset;
	const table = UUID_LOOKUP_TABLE;
	return [
		table[bytes[i++]],
		table[bytes[i++]],
		table[bytes[i++]],
		table[bytes[i++]],
		"-",
		table[bytes[i++]],
		table[bytes[i++]],
		"-",
		table[bytes[i++]],
		table[bytes[i++]],
		"-",
		table[bytes[i++]],
		table[bytes[i++]],
		"-",
		table[bytes[i++]],
		table[bytes[i++]],
		table[bytes[i++]],
		table[bytes[i++]],
		table[bytes[i++]],
		table[bytes[i++]],
	].join("");
};

// Random number generation for UUID
const getRandomValues = (() => {
	if (crypto?.getRandomValues) {
		return crypto.getRandomValues.bind(crypto);
	}
	if (typeof msCrypto !== "undefined" && typeof window.msCrypto.getRandomValues === "function") {
		return msCrypto.getRandomValues.bind(msCrypto);
	}
	return null;
})();

const generateRandomBytes = (() => {
	if (getRandomValues) {
		const buffer = new Uint8Array(16);
		return () => {
			getRandomValues(buffer);
			return buffer;
		};
	}

	// Fallback to Math.random
	const buffer = new Array(16);
	return () => {
		for (let i = 0; i < 16; i++) {
			if ((i & 0x03) === 0) {
				buffer[i] = Math.random() * 0x100000000;
			}
			buffer[i] = (buffer[i] >>> ((i & 0x03) << 3)) & 0xff;
		}
		return buffer;
	};
})();

// UUID v4 generator
const generateUuid = (options = {}, buffer, offset = 0) => {
	if (typeof options === "string") {
		buffer = options === "binary" ? new Array(16) : null;
		options = {};
	}

	const randomBytes = (options.random || options.rng || generateRandomBytes)();

	// Set version (4) and variant bits
	randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
	randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

	if (buffer) {
		for (let i = 0; i < 16; ++i) {
			buffer[offset + i] = randomBytes[i];
		}
		return buffer;
	}

	return bytesToUuid(randomBytes);
};

// Event types
const EventType = {
	Load: 1,
	Additional: 2,
	WebVitalsV2: 3,
};

const _FetchPriority = {
	High: "high",
	Low: "low",
	Auto: "auto",
};

// Beacon sending utility
const sendObjectBeacon = (queryString, data, callback, useBeacon = false, url = null) => {
	const endpoint =
		url ||
		(data.siteToken && data.versions.fl ? `/cdn-cgi/rum?${queryString}` : `/cdn-cgi/beacon/performance?${queryString}`);

	let canUseBeacon = true;

	// Check Chrome version compatibility for sendBeacon
	if (navigator && typeof navigator.userAgent === "string") {
		try {
			const chromeMatch = navigator.userAgent.match(/Chrome\/([0-9]+)/);
			if (chromeMatch?.[0].toLowerCase().includes("chrome") && parseInt(chromeMatch[1], 10) < 81) {
				canUseBeacon = false;
			}
		} catch (_error) {
			// Ignore parsing errors
		}
	}

	const payload = JSON.stringify(data);

	if (navigator && typeof navigator.sendBeacon === "function" && canUseBeacon && useBeacon) {
		data.st = 1; // sendBeacon transport
		const blob = new Blob([payload], { type: "application/json" });
		navigator.sendBeacon(endpoint, blob);
	} else {
		data.st = 2; // XMLHttpRequest transport
		const xhr = new XMLHttpRequest();

		if (callback) {
			xhr.onreadystatechange = function () {
				if (this.readyState === 4 && this.status === 204) {
					callback();
				}
			};
		}

		xhr.open("POST", endpoint, true);
		xhr.setRequestHeader("content-type", "application/json");
		xhr.send(payload);
	}
};

// Web Vitals measurement utilities
class WebVitalsTracker {
	constructor() {
		this.navigationType = null;
		this.metrics = {};
		this.firstHiddenTime = -1;
		this.pageId = generateUuid();
		this.navigationHistory = [];
		this.isInitialized = false;
	}

	initialize(config) {
		if (this.isInitialized) return;
		this.isInitialized = true;
		this.config = config;
		this.setupPerformanceObservers();
		this.setupNavigationTracking();
		this.setupVisibilityTracking();
	}

	setupPerformanceObservers() {
		if (typeof PerformanceObserver !== "function") return;

		// Core Web Vitals observers
		this.observeLCP();
		this.observeFID();
		this.observeFCP();
		this.observeINP();
		this.observeTTFB();
		this.observeCLS();
	}

	observeLCP() {
		this.createPerformanceObserver("largest-contentful-paint", (entries) => {
			const lastEntry = entries[entries.length - 1];
			if (lastEntry && lastEntry.startTime < this.getFirstHiddenTime()) {
				this.updateMetric("lcp", {
					value: Math.max(lastEntry.startTime - this.getNavigationStart(), 0),
					entries: [lastEntry],
				});
			}
		});
	}

	observeFID() {
		this.createPerformanceObserver("first-input", (entries) => {
			entries.forEach((entry) => {
				if (entry.startTime < this.getFirstHiddenTime()) {
					this.updateMetric("fid", {
						value: entry.processingStart - entry.startTime,
						entries: [entry],
					});
				}
			});
		});
	}

	observeFCP() {
		this.createPerformanceObserver("paint", (entries) => {
			entries.forEach((entry) => {
				if (entry.name === "first-contentful-paint" && entry.startTime < this.getFirstHiddenTime()) {
					this.updateMetric("fcp", {
						value: Math.max(entry.startTime - this.getNavigationStart(), 0),
						entries: [entry],
					});
				}
			});
		});
	}

	observeINP() {
		// INP (Interaction to Next Paint) tracking
		this.createPerformanceObserver(
			"event",
			(entries) => {
				entries.forEach((entry) => {
					if (entry.interactionId) {
						this.processInteractionEntry(entry);
					}
				});
			},
			{ durationThreshold: 40 },
		);
	}

	observeTTFB() {
		// TTFB is calculated from navigation timing
		const navigationEntry = this.getNavigationEntry();
		if (navigationEntry) {
			const ttfb = Math.max(navigationEntry.responseStart - this.getNavigationStart(), 0);
			this.updateMetric("ttfb", {
				value: ttfb,
				entries: [navigationEntry],
			});
		}
	}

	observeCLS() {
		let clsValue = 0;
		const clsEntries = [];

		this.createPerformanceObserver("layout-shift", (entries) => {
			entries.forEach((entry) => {
				if (!entry.hadRecentInput) {
					clsValue += entry.value;
					clsEntries.push(entry);

					this.updateMetric("cls", {
						value: clsValue,
						entries: [...clsEntries],
					});
				}
			});
		});
	}

	createPerformanceObserver(type, callback, options = {}) {
		try {
			if (PerformanceObserver.supportedEntryTypes?.includes(type)) {
				const observer = new PerformanceObserver((list) => {
					Promise.resolve().then(() => callback(list.getEntries()));
				});

				observer.observe({ type, buffered: true, ...options });
				return observer;
			}
		} catch (error) {
			console.warn(`Failed to create PerformanceObserver for ${type}:`, error);
		}
		return null;
	}

	updateMetric(name, data) {
		const currentPath = window.location.pathname;

		if (!this.navigationType) {
			this.navigationType = this.getNavigationType();
		}

		this.metrics[name] = {
			value: data.value,
			path: currentPath,
			...this.getMetricAttribution(name, data),
		};
	}

	getMetricAttribution(metricName, data) {
		const attribution = {};
		const entries = data.entries || [];

		switch (metricName) {
			case "cls":
				if (entries.length > 0) {
					const largestShift = entries.reduce((max, entry) => (entry.value > max.value ? entry : max));
					if (largestShift.sources?.length > 0) {
						const source = largestShift.sources.find((s) => s.node?.nodeType === 1) || largestShift.sources[0];
						if (source) {
							attribution.element = this.getElementSelector(source.node);
							attribution.currentRect = source.currentRect;
							attribution.previousRect = source.previousRect;
						}
					}
				}
				break;

			case "fid":
				if (entries.length > 0) {
					const entry = entries[0];
					attribution.element = this.getElementSelector(entry.target);
					attribution.name = entry.name;
				}
				break;

			case "lcp":
				if (entries.length > 0) {
					const entry = entries[0];
					attribution.element = this.getElementSelector(entry.element);
					attribution.size = entry.size;
					attribution.url = entry.url;
				}
				break;
		}

		return attribution;
	}

	getElementSelector(element, maxLength = 100) {
		if (!element) return "";

		let selector = "";
		let current = element;

		try {
			while (current && current.nodeType !== 9) {
				// Not document node
				const nodeName =
					current.nodeType === 1 ? current.nodeName.toLowerCase() : current.nodeName.toUpperCase().replace(/^#/, "");

				const id = current.id ? `#${current.id}` : "";
				const classes = current.classList?.value?.trim();
				const classSelector = classes ? `.${classes.replace(/\s+/g, ".")}` : "";

				const part = nodeName + id + classSelector;

				if (selector.length + part.length > maxLength - 1) {
					return selector || part;
				}

				selector = selector ? `${part}>${selector}` : part;

				if (current.id) break; // Stop at first ID
				current = current.parentNode;
			}
		} catch (error) {
			console.warn("Error building element selector:", error);
		}

		return selector;
	}

	getNavigationType() {
		if (this.firstHiddenTime >= 0) return "back-forward-cache";

		const navEntry = this.getNavigationEntry();
		if (!navEntry) return "navigate";

		if (document.prerendering || this.getNavigationStart() > 0) return "prerender";
		if (document.wasDiscarded) return "restore";
		if (navEntry.type) return navEntry.type.replace(/_/g, "-");

		return "navigate";
	}

	getNavigationEntry() {
		return performance.getEntriesByType?.("navigation")?.[0] || null;
	}

	getNavigationStart() {
		const navEntry = this.getNavigationEntry();
		return navEntry?.activationStart || 0;
	}

	getFirstHiddenTime() {
		if (this.firstHiddenTime === -1) {
			this.firstHiddenTime = document.visibilityState === "hidden" && !document.prerendering ? 0 : Infinity;
			this.setupVisibilityTracking();
		}
		return this.firstHiddenTime;
	}

	setupVisibilityTracking() {
		const updateHiddenTime = (event) => {
			if (document.visibilityState === "hidden" && this.firstHiddenTime > -1) {
				this.firstHiddenTime = event.type === "visibilitychange" ? event.timeStamp : 0;
			}
		};

		addEventListener("visibilitychange", updateHiddenTime, true);
		addEventListener("prerenderingchange", updateHiddenTime, true);
	}

	setupNavigationTracking() {
		// Handle page load
		if (document.readyState === "complete") {
			this.handlePageLoad();
		} else {
			addEventListener("load", () => {
				setTimeout(() => this.handlePageLoad(), 0);
			});
		}

		// Handle SPA navigation
		if (this.config?.spa !== false) {
			this.setupSPATracking();
		}

		// Handle page visibility changes
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				this.sendBeacon();
			}
		});
	}

	setupSPATracking() {
		const originalPushState = history.pushState;

		history.pushState = (...args) => {
			this.handleNavigation();
			return originalPushState.apply(history, args);
		};

		addEventListener("popstate", () => {
			this.handleNavigation();
		});
	}

	handleNavigation() {
		this.sendBeacon();
		this.pageId = generateUuid();
		this.metrics = {};
		this.addToNavigationHistory();
	}

	handlePageLoad() {
		this.sendPageLoadBeacon();
		this.addToNavigationHistory();
	}

	addToNavigationHistory() {
		this.navigationHistory.push({
			id: this.pageId,
			url: this.getCurrentUrl(),
			timestamp: Date.now(),
		});

		if (this.navigationHistory.length > 3) {
			this.navigationHistory.shift();
		}
	}

	getCurrentUrl() {
		const origin = window.location.origin || `${window.location.protocol}//${window.location.host}`;
		const pathname = window.location.pathname || "";
		return origin + pathname;
	}

	sendPageLoadBeacon() {
		const data = this.buildBeaconData(EventType.Load);
		this.sendData(data, false);
	}

	sendWebVitalsBeacon() {
		const data = this.buildBeaconData(EventType.WebVitalsV2);
		this.sendData(data, true);
	}

	sendBeacon() {
		this.sendWebVitalsBeacon();
	}

	buildBeaconData(eventType) {
		const navEntry = this.getNavigationEntry();
		const url = this.getCurrentUrl();

		const data = {
			eventType,
			pageloadId: this.pageId,
			location: url,
			startTime: performance.timeOrigin || 0,
			versions: {
				js: "2024.6.1",
				fl: this.config?.version || "",
			},
			navigationType: this.navigationType,
			referrer: document.referrer || "",
			serverTimings: this.getServerTimings(),
		};

		if (this.config?.token) {
			data.siteToken = this.config.token;
		}

		if (this.config?.icTag) {
			data.icTag = this.config.icTag;
		}

		if (eventType === EventType.WebVitalsV2) {
			// Add Web Vitals metrics
			["lcp", "fid", "cls", "fcp", "ttfb", "inp"].forEach((metric) => {
				data[metric] = this.metrics[metric] || { value: -1, path: undefined };
			});

			data.landingPath = this.getLandingPath();
		} else {
			// Add performance timing data for page load events
			this.addTimingData(data, navEntry);
		}

		return data;
	}

	addTimingData(data, navEntry) {
		if (navEntry) {
			data.timingsV2 = {};
			data.versions.timings = 2;
			data.dt = navEntry.deliveryType;

			// Copy relevant timing properties
			const timingProps = [
				"domainLookupStart",
				"domainLookupEnd",
				"connectStart",
				"connectEnd",
				"requestStart",
				"responseStart",
				"responseEnd",
				"domInteractive",
				"domContentLoadedEventStart",
				"domContentLoadedEventEnd",
				"domComplete",
				"loadEventStart",
				"loadEventEnd",
			];

			timingProps.forEach((prop) => {
				if (prop in navEntry) {
					data.timingsV2[prop] = navEntry[prop];
				}
			});

			if (navEntry.nextHopProtocol) data.timingsV2.nextHopProtocol = navEntry.nextHopProtocol;
			if (navEntry.transferSize) data.timingsV2.transferSize = navEntry.transferSize;
			if (navEntry.decodedBodySize) data.timingsV2.decodedBodySize = navEntry.decodedBodySize;
		}

		// Add memory info if available
		if (performance.memory) {
			data.memory = {
				usedJSHeapSize: performance.memory.usedJSHeapSize,
				totalJSHeapSize: performance.memory.totalJSHeapSize,
				jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
			};
		}

		// Add paint timings
		data.firstPaint = this.getPaintTiming("first-paint");
		data.firstContentfulPaint = this.getPaintTiming("first-contentful-paint");
	}

	getPaintTiming(name) {
		if (name === "first-contentful-paint" && this.metrics.fcp?.value) {
			return this.metrics.fcp.value;
		}

		const paintEntries = performance.getEntriesByType?.("paint") || [];
		const entry = paintEntries.find((e) => e.name === name);
		return entry ? entry.startTime : 0;
	}

	getLandingPath() {
		try {
			const navEntry = this.getNavigationEntry();
			if (navEntry?.name) {
				return new URL(navEntry.name).pathname;
			}
			return window.location.pathname;
		} catch {
			return window.location.pathname;
		}
	}

	getServerTimings() {
		if (!this.config?.serverTiming) return [];

		const timings = [];
		const entryTypes = ["navigation", "resource"];

		for (const entryType of entryTypes) {
			const entries = performance.getEntriesByType(entryType);

			for (const entry of entries) {
				if (!entry.serverTiming) continue;

				// Filter resources by location if specified
				if (entryType === "resource") {
					const allowedStarts = this.config.serverTiming.location_startswith;
					if (allowedStarts && Array.isArray(allowedStarts)) {
						const isAllowed = allowedStarts.some((start) => entry.name.startsWith(start));
						if (!isAllowed) continue;
					}
				}

				for (const timing of entry.serverTiming) {
					if (this.config.serverTiming.name?.[timing.name]) {
						try {
							const url = new URL(entry.name);
							timings.push({
								location: entryType === "resource" ? `${url.origin}${url.pathname}` : undefined,
								name: timing.name,
								dur: timing.duration,
								desc: timing.description,
							});
						} catch {
							// Ignore URL parsing errors
						}
					}
				}
			}
		}

		return timings;
	}

	sendData(data, useBeacon) {
		const endpoint = this.config?.send?.to;
		sendObjectBeacon("", data, () => {}, useBeacon, endpoint);

		// Forward to additional endpoint if configured
		if (this.config?.forward?.url) {
			sendObjectBeacon("", data, () => {}, useBeacon, this.config.forward.url);
		}
	}
}

// Main initialization
(() => {
	const performance = window.performance || window.webkitPerformance || window.msPerformance || window.mozPerformance;

	if (!performance) return;

	// Get configuration from script tag or global object
	const BEACON_ATTR = "data-cf-beacon";
	const currentScript = document.currentScript || document.querySelector?.(`script[${BEACON_ATTR}]`);

	let config = window.__cfBeacon || {};

	if (currentScript) {
		const beaconData = currentScript.getAttribute(BEACON_ATTR);
		if (beaconData) {
			try {
				config = { ...config, ...JSON.parse(beaconData) };
			} catch (error) {
				console.warn("Failed to parse beacon configuration:", error);
			}
		} else {
			// Try to extract config from script src
			const src = currentScript.getAttribute("src");
			if (src) {
				try {
					const params = new URLSearchParams(src.replace(/^[^?]+\??/, ""));
					const token = params.get("token");
					if (token) config.token = token;

					const spa = params.get("spa");
					config.spa = spa === null || spa === "true";
				} catch (error) {
					console.warn("Failed to parse script src parameters:", error);
				}
			}
		}

		if (config.load !== "multi") {
			config.load = "single";
		}
		window.__cfBeacon = config;
	}

	// Initialize tracking if we have a valid token
	if (config?.token) {
		const tracker = new WebVitalsTracker();

		// Wait for page to be interactive
		if (document.prerendering) {
			document.addEventListener("prerenderingchange", () => tracker.initialize(config), { once: true });
		} else {
			tracker.initialize(config);
		}
	}
})();
