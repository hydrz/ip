const JSONP_TIMEOUT = 10000;

/**
 * Perform a JSONP request.
 * @param {Object} options - JSONP request options.
 * @param {function(string):string} options.urlForCallback - Function that returns URL for callback.
 * @param {string} [options.namespace='__jsonp_callbacks__'] - Global namespace for callbacks.
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel request.
 * @param {number} [options.timeout=JSONP_TIMEOUT] - Timeout in ms.
 * @returns {Promise<any>} Resolves with JSON payload or rejects on error.
 */
export const jsonpRequest = ({
	urlForCallback,
	namespace = "__jsonp_callbacks__",
	timeout = JSONP_TIMEOUT,
	signal,
} = {}) => {
	// Validate browser environment
	if (typeof window === "undefined" || typeof document === "undefined" || !document.body) {
		return Promise.reject(new Error("JSONP is only available in the browser"));
	}

	return new Promise((resolve, reject) => {
		// Ensure namespace exists
		if (!window[namespace]) window[namespace] = {};

		const cbKey = `__${Date.now()}_${Math.random().toString(36).slice(2)}__`;
		const fullCallback = `${namespace}.${cbKey}`;
		const script = document.createElement("script");
		script.async = true;
		script.src = urlForCallback(fullCallback);

		let timeoutId = null;

		const cleanup = () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			try {
				script.remove();
			} catch (_e) {
				// Ignore removal errors
			}
			try {
				delete window[namespace][cbKey];
				if (Object.keys(window[namespace]).length === 0) {
					delete window[namespace];
				}
			} catch (_e) {
				// Ignore deletion errors
			}
		};

		// Set up timeout
		timeoutId = setTimeout(() => {
			cleanup();
			reject(new Error("JSONP timeout"));
		}, timeout);

		// Define success callback
		window[namespace][cbKey] = (data) => {
			cleanup();
			resolve(data);
		};

		// Handle script loading errors
		script.addEventListener("error", () => {
			cleanup();
			reject(new Error("JSONP script load error"));
		});

		// Handle AbortSignal
		if (signal) {
			if (signal.aborted) {
				cleanup();
				reject(new DOMException("Aborted", "AbortError"));
				return;
			}
			const onAbort = () => {
				cleanup();
				reject(new DOMException("Aborted", "AbortError"));
			};
			signal.addEventListener("abort", onAbort, { once: true });
		}

		// Execute request
		document.body.appendChild(script);
	});
};
