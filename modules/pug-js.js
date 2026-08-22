var fs = require('fs'),
	path = require('path'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	colors = require('ansi-colors'),
	pug = require('pug'),
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/'),
	uniqid = () => URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, '');

const start = (options) => {
	return new Promise(async (resolve, reject) => {
		var input = getPath('.', 'src', 'pug', 'index.pug'),
			outputPath = getPath('.', 'application'),
			output = getPath(outputPath, 'index.html'),
			target = options.sdk ? 'sdk' : 'normal';
		try {
			log(colors.yellowBright(`Компиляция PUG`), true);
			breakLn();
			var fn = pug.compileFile(input, {
				debug: false,                // включать отладочную информацию в вывод
				globals: [],                 // глобальные переменные, доступные в шаблоне
				locals: {},                  // переменные по умолчанию для всех рендеров через эту функцию
				self: false,                 // генерировать код с `this` вместо локальных переменных
				doctype: 'html',             // тип документа
				compileDebug: true           // включать отладочные данные в скомпилированную функцию
			});
			var html = fn({
				// Переменные для шаблона
				hash: uniqid(),
				target: target
			});
			// Создаём директорию application
			try {
				fs.mkdirSync(outputPath, {recursive: true});
			} catch(e) {
				reject(e);
			}
			fs.writeFileSync(output, html + "\n");
			log(colors.yellowBright(`Компиляция PUG завершена`), true);
			breakLn();
			resolve();
		} catch(e) {
			reject(e);
		}
	});
};

module.exports = start;
