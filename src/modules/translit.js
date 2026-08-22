const { transliterate } = require("transliteration");

const tagTranslit = (value) => {
	if (!value || typeof value !== 'string') return '';
	let tag = transliterate(value.trim());
	return tag.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
};

const translit = (value) => {
	if (!value || typeof value !== 'string') return '';
	return transliterate(value.trim());
};

module.exports = {
	translit: translit,
	tagTranslit: tagTranslit
};
