var fs = require('fs'),
	path = require('path'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	colors = require('ansi-colors'),
	ttf2woff2 = require('ttf2woff2'),
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/');

var maxLength = 9;

const start = function (options) {
	maxLength = options.maxLength;
	return new Promise((resolve, reject) => {
		log(colors.yellowBright(`Конвертирование ttf2woff2`), true);
		breakLn();
		const output = getPath('.', 'application', 'fonts');
		var files = [];
		// Удаляем директорию application/fonts
		try {
			fs.rmSync(output, { recursive: true, force: true });
		} catch(e) {
			reject(e);
			return;
		}
		// Читаем директорию src/fonts
		try {
			files = fs.readdirSync(getPath('.', 'src', 'fonts'), {withFileTypes: false})
				.filter(f => /[.]ttf$/.test(f))
				.map(f => {
					return getPath('.', 'src', 'fonts', f);
				});
		} catch(e) {
			reject(e);
			return;
		}
		// Создаём директорию application/fonts
		try {
			fs.mkdirSync(output, {recursive: true});
		} catch(e) {
			reject(e);
			return;
		}
		// Конвертируем src/fonts/*.ttf в application/fonts/*.woff2
		files.forEach((f) => {
			var ext = path.extname(f),
				ttfName = path.basename(f, ext),
				woffFile = getPath(output, ttfName) + ".woff2";
			try {
				fs.writeFileSync(woffFile, ttf2woff2(fs.readFileSync(f)));
				log(colors.yellowBright("Конвертирование".padStart(maxLength)) + ": " + colors.cyanBright(woffFile));
			} catch(e) {
				reject(e);
				return;
			}
		});
		breakLn();
		log(colors.yellowBright(`Конвертирование ttf2woff2 завершено`), true);
		breakLn();
		resolve();
	});
};

module.exports = start;
