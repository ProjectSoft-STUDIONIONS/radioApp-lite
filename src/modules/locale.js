const isEmpty = (value) => {
	if (value == null) return true;
	if (value === false) return true;
	if (value === undefined) return true;
	const s = String(value).trim();
	return s === '';
};

const isArray = value => Array.isArray(value);

const locale = {
	get: (name, placeholders = []) => {
		name = String(name).trim();
		if(!isArray(placeholders)) {
			placeholders = [];
		} else {
			placeholders = Object.values(placeholders).slice(0, 8);
		}
		const message = chrome.i18n.getMessage(name, placeholders);
		return isEmpty(message) ? name : message;
	}
};

module.exports = locale;
