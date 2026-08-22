var fs = require('fs'),
	path = require('path'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	colors = require('ansi-colors'),
	less = require('less'),
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/');

const maxLength = 9;

const start = (options) => {
	return new Promise(async (resolve, reject) => {
		// Основной main.less
		var input = getPath('.', 'src', 'less', 'main.less'),
			// Подключаем croppie.css
			cropie = getPath('.', 'bower_components', 'Croppie', 'croppie.css'),
			// Директория сохранения
			outputPath = getPath('.', 'application', 'css'),
			// Выходной файл
			output = getPath(outputPath, 'main.css');
		try {
			log(colors.yellowBright(`Компиляция Less в CSS`), true);
			breakLn();
			// Читаем main.less
			var lessFile = fs.readFileSync(input).toString();
			// Читаем croppie.css
			var cropieFile = fs.readFileSync(cropie).toString();
			// Объединяем croppie.css и main.less. Компилируем.
			var outputLess = await less.render(cropieFile + lessFile , {
				sourceMap: false,
				paths: ['./src/less'],
				compress: true
			});
			// Создаём директорию application/css
			try {
				fs.mkdirSync(outputPath, {recursive: true});
			} catch(e) {
				reject(e);
			}
			fs.writeFileSync(output, outputLess.css + "\n");
			log(colors.yellowBright(`Компиляция Less в CSS завершена`), true);
			breakLn();
			resolve();
		} catch(e) {
			reject(e);
		}
	});
};

module.exports = start;
