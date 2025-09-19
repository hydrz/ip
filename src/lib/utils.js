import { MESSAGES } from "./ui.js";

const FETCH_TIMEOUT = 5000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 500;
const DEFAULT_CONCURRENCY = 3;

/**
 * Sleeps for the specified number of milliseconds.
 * @param {number} ms - milliseconds to sleep.
 * @returns {Promise<void>} resolves after the specified time.
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with timeout using AbortController.
 * @param {RequestInfo} input - fetch input.
 * @param {RequestInit} [init={}] - fetch init options.
 * @param {number} [timeout=FETCH_TIMEOUT] - timeout in ms.
 * @returns {Promise<Response>} fetch response promise.
 */
export const fetchWithTimeout = async (input, init = {}, timeout = FETCH_TIMEOUT) => {
	const controller = new AbortController();
	const signal = controller.signal;
	const merged = { ...init, signal };
	const timer = setTimeout(() => controller.abort(), timeout);
	try {
		const resp = await fetch(input, merged);
		return resp;
	} finally {
		clearTimeout(timer);
	}
};

/**
 * Runs an async function with retries, delay, and per-attempt timeout.
 * @param {Function} fn - async function to run. Receives an object { attempt, signal }.
 * @param {Object} [options={}] - options for retries, delay, and timeout.
 * @param {number} [options.retries=DEFAULT_RETRIES] - number of attempts.
 * @param {number} [options.delayFactor=RETRY_BASE_DELAY] - base delay in ms between attempts.
 * @param {number} [options.timeoutPerAttempt=FETCH_TIMEOUT] - timeout in ms for each attempt.
 * @returns {Promise<any>} resolves with the function result or rejects after all attempts fail.
 */
export const runWithRetries = async (
	fn,
	{ retries = DEFAULT_RETRIES, delayFactor = DEFAULT_RETRY_DELAY, timeoutPerAttempt = FETCH_TIMEOUT } = {},
) => {
	let lastErr;
	for (let attempt = 1; attempt <= retries; attempt += 1) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutPerAttempt);
		try {
			const result = await fn({ attempt, signal: controller.signal });
			clearTimeout(timer);
			return result;
		} catch (err) {
			clearTimeout(timer);
			lastErr = err;
			if (attempt < retries) {
				// eslint-disable-next-line no-await-in-loop
				await sleep(delayFactor * attempt);
			}
		}
	}
	throw lastErr;
};

/**
 * Runs multiple async tasks with a concurrency limit.
 * @param {Function[]} tasks - array of async functions returning promises.
 * @param {number} [concurrency=DEFAULT_CONCURRENCY] - max number of concurrent tasks.
 * @returns {Promise<any[]>} resolves with an array of results.
 */
export const runWithConcurrency = async (tasks = [], concurrency = DEFAULT_CONCURRENCY) => {
	const results = [];
	const queue = tasks.slice();
	const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
		while (queue.length > 0) {
			const task = queue.shift();
			if (!task) break;
			// eslint-disable-next-line no-await-in-loop
			results.push(await task());
		}
	});
	await Promise.all(workers);
	return results;
};

/**
 * Safely parses JSON from a string or Response object.
 * If parsing fails, returns the original input or text.
 * @param {string|Response|null} input - JSON string or fetch Response.
 * @returns {Promise<any>} resolves with parsed JSON or original input/text.
 */
export const safeParseJson = async (input) => {
	if (!input) return null;
	if (typeof input === "string") {
		try {
			return JSON.parse(input);
		} catch {
			return input;
		}
	}
	// assume Response
	const ct = input.headers?.get?.("content-type") || "";
	const text = await input.text();
	if (ct.includes("application/json")) {
		try {
			return JSON.parse(text);
		} catch {
			return text;
		}
	}
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
};

/**
 * Creates a safe wrapper for service fetch functions.
 * @param {string} serviceName - Name of the service for error reporting.
 * @param {Function} fetchFn - The actual fetch function.
 * @param {number} [retries=DEFAULT_RETRIES] - Number of retry attempts.
 * @returns {Function} A wrapped function that handles errors gracefully.
 */
export const createSafeFetch =
	(serviceName, fetchFn, retries = DEFAULT_RETRIES) =>
	async () => {
		try {
			return await runWithRetries(async ({ signal }) => fetchFn({ signal }), {
				retries,
				timeoutPerAttempt: FETCH_TIMEOUT,
			});
		} catch (err) {
			console.error(`${serviceName} error:`, err?.message || err);
			return { ip: MESSAGES.FETCH_FAILED, addr: "" };
		}
	};
