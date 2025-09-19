/**
 * Updates a DOM element with text content and title.
 * @param {string} selector - CSS selector for the element.
 * @param {string} content - Content to set.
 * @param {string} [className] - Optional CSS class to apply.
 */
export const updateElement = (selector, content, className) => {
	const element = document.querySelector(selector);
	if (element) {
		element.textContent = content;
		element.title = content;
		if (className) {
			element.className = className;
		}
	}
};

/**
 * Creates DOM element with attributes and content.
 * @param {string} tag - HTML tag name.
 * @param {Object} [attributes={}] - Element attributes.
 * @param {string} [content=''] - Text content.
 * @param {string} [className=''] - CSS class names.
 * @returns {HTMLElement} Created element.
 */
export const createElement = (tag, attributes = {}, content = "", className = "") => {
	const element = document.createElement(tag);

	Object.entries(attributes).forEach(([key, value]) => {
		element.setAttribute(key, value);
	});

	if (content) element.textContent = content;
	if (className) element.className = className;

	return element;
};

/**
 * Caches DOM queries to avoid repeated lookups.
 */
const elCache = new Map();
export const cachedQuery = (selector) => {
	if (elCache.has(selector)) return elCache.get(selector);
	const el = document.querySelector(selector);
	elCache.set(selector, el);
	return el;
};
