const fs = require('fs'),
	path = require('path'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	colors = require('ansi-colors'),
	pug = require('pug'),
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/'),
	uniqid = () => URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, '');

const start = (options) => {
	options = Object.assign(
		{
			sdk: false,
			src: "",
			dest: "",
			maxLength: 9
		},
		options
	);
	return new Promise( (resolve, reject) => {

		log(colors.yellowBright(`Компиляция PUG`), true);
		breakLn();

		const inputPath = options.src,
			outputPath = options.dest,
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
					src: getPath(inputPath, file.name),
					dest: getPath(outputPath, `${fileName}.html`)
				};
			});
		// Создаём директорию application
		try {
			fs.mkdirSync(outputPath, {recursive: true});
		} catch(e) {
			reject(e);
		}
		for(const data of items) {
			try {
				log(
					colors.yellowBright("Компиляция".padStart(options.maxLength)) +
						": " +
						colors.cyanBright(data.src) +
						' -> ' +
						colors.cyanBright(data.dest)
				);
				var fn = pug.compileFile(data.src, {
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
				fs.writeFileSync(data.dest, html + "\n");
			} catch(e) {
				reject(e);
			}
		}
		breakLn();
		log(colors.yellowBright(`Компиляция PUG завершена`), true);
		breakLn();
		resolve();
	});
};

module.exports = start;
