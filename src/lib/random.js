// Data mappings
const PROVINCE_CITY_MAP = {
	北京: ["北京市"],
	上海: ["上海市"],
	广东: ["广州市", "深圳市"],
	浙江: ["杭州市"],
	四川: ["成都市"],
	湖北: ["武汉市"],
	江苏: ["南京市"],
};

const DOMESTIC_ISP_LIST = ["电信", "联通", "移动", "广电", "铁通"];

const COUNTRY_CITY_MAP = {
	USA: ["New York", "Los Angeles", "San Francisco", "Chicago"],
	UK: ["London", "Manchester", "Birmingham"],
	Japan: ["Tokyo", "Osaka", "Kyoto"],
	Germany: ["Berlin", "Munich", "Frankfurt"],
	France: ["Paris", "Marseille", "Lyon"],
	Canada: ["Toronto", "Vancouver", "Montreal"],
	Australia: ["Sydney", "Melbourne", "Brisbane"],
};

const FOREIGN_ISP_LIST = ["AT&T", "Verizon", "BT", "NTT", "Deutsche Telekom", "Orange", "Bell", "Telstra"];

/**
 * Generates a random IP address.
 * @returns {string} Random IP address.
 */
export const generateRandomIP = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");

/**
 * Generates a random address based on location type.
 * @param {boolean} isDomestic - Whether to generate domestic or foreign address.
 * @returns {string} Random address string.
 */
export const generateRandomAddress = (isDomestic) => {
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

/**
 * Generate a random alphanumeric string of specified length.
 * @param {number} [length=16] - Length of the random string.
 * @returns {string} Random string containing letters and numbers.
 */
export const randomString = (length = 16) => {
	const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let result = "";
	for (let i = length; i > 0; --i) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
};
