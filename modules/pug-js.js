const fs = require('fs'),
	path = require('path'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	colors = require('ansi-colors'),
	pug = require('pug'),
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/'),
	uniqid = () => URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, '');

const start = (options) => {
	return new Promise(async (resolve, reject) => {

		log(colors.yellowBright(`Компиляция PUG`), true);
		breakLn();

		const inputPath = getPath('.', 'src', 'pug'),
			outputPath = getPath('.', 'application'),
			target = options.sdk ? 'sdk' : 'normal';

		const items = [...fs.readdirSync(inputPath, { withFileTypes: true })]
			// Получить только файлы
			.filter(file => file.isFile())
			.filter(file => {
				const ext = path.extname(file.name);
				return ext.toLowerCase() == '.pug';
			})
			.map(file => {
				const fileName = path.basename(file.name, '.pug');
				return {
					src: path.join(inputPath, file.name).replace(/[\\]+/g, '/'),
					dest: path.join(outputPath, `${fileName}.html`).replace(/[\\]+/g, '/')
				};
			});
		// Создаём директорию application
		//"innosetup-compiler": "git+https://github.com/ProjectSoft-STUDIONIONS/node-innosetup-compiler.git",
		try {
			fs.mkdirSync(outputPath, {recursive: true});
		} catch(e) {
			reject(e);
		}
		for(const data in items) {
			// items[data]
			try {
				var fn = pug.compileFile(items[data].src, {
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
				fs.writeFileSync(items[data].dest, html + "\n");
			} catch(e) {
				reject(e);
			}
		}
		log(colors.yellowBright(`Компиляция PUG завершена`), true);
		breakLn();
		resolve();
		/*
		try {
			log(colors.yellowBright(`Компиляция PUG`), true);
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
		*/
	});
};

module.exports = start;
