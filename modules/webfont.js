const fs = require('fs'),
	path = require('path'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	colors = require('ansi-colors'),
	{ webfont } = require("webfont");

module.exports = function(options) {
	return new Promise((resolve, reject) => {
		opions = Object.assign({
			dest: "temp/fonts",
			fontName: "webwont",
			formats: ["ttf"],
			template: "./",
			templateFontName: "webfont",
			templateClassName: "icon",
			templateFontPath: '../fonts/',
			files: "*.svg",
			verbose: false,
			centerHorizontally: false,
			centerVertically: false,
			normalize: true,
			unicodeRange: true,
		}, options);
		const result = webfont(opions).then((r) => {
			resolve(r);
		}).catch((e) => {
			console.log(e);
			reject(e);
		});
	})
}
