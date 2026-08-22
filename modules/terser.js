const fs = require("fs"),
	path = require("path"),
	prettier = require('prettier'),
	{ minify } = require("terser"),
	colors = require('ansi-colors'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/');

const start = (options) => {
	options = Object.assign({
		src: "",
		dest: "",
	}, options);
	return new Promise(async (resolve, reject) => {
		log(colors.yellowBright(`Минимизация modules`), true);
		breakLn();
		const srcDir = options.src;
		const outDir = options.dest;
		const items = [...fs.readdirSync(srcDir, { withFileTypes: true })]
			// Получить только файлы
			.filter(file => file.isFile())
			.map(file => path.join(srcDir, file.name))
			.map(file => {
				const fileName = path.basename(file);
				const outFile = getPath(outDir, fileName);
				const srcCode = fs.readFileSync(file).toString();
				return {
					src: srcCode,
					dest: getPath(outDir, fileName) 
				};
			});
		for(const key in items) {
			try{
				const result = await minify(items[key].src, {
						compress: true,
						mangle: true,
						sourceMap: false,
						output: {
							comments: false
						}
					});
				fs.writeFileSync(items[key].dest, `/**!
 * Module ${path.basename(items[key].dest)} for "Your Radio"
 * 
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
` + result.code + "\n", {encode: 'utf8'});
			} catch(e) {
				reject(e);
			}
		}
		log(colors.yellowBright(`Минимизация modules завершено`), true);
		breakLn();
		resolve();
	});
};

module.exports = start;
