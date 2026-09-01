var fs = require('fs'),
	path = require('path'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	colors = require('ansi-colors'),
	{ minify } = require("terser"),
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/');

const start = (options) => {
	return new Promise(async (resolve, reject) => {
		const input = getPath('.', 'src', 'js', 'main.js'),
			outputPath = getPath('.', 'application', 'js'),
			output = getPath(outputPath, 'main.js');
		// Создаём директорию application/js
		try {
			fs.mkdirSync(outputPath, {recursive: true});
		} catch(e) {
			reject(e);
		}
		try {
			log(colors.yellowBright(`Минимизация JS`), true);
			breakLn();
			const tagsEditor = fs.readFileSync(getPath('.', 'src', 'js', 'tags-editor.js')).toString();
			const fileSortable = fs.readFileSync(getPath('.', 'bower_components', 'Sortable', 'Sortable.js')).toString();
			const fileCroppie = fs.readFileSync(getPath('.', 'bower_components', 'Croppie', 'croppie.js')).toString();
			const fileMain = fs.readFileSync(input).toString();
			const code = [fileSortable, fileCroppie, tagsEditor, fileMain].join('\n\n');
			const result = await minify(code, {
					compress: true,
					mangle: false,
					sourceMap: false,
					output: {
						comments: false
					}
				});

			const writeCode = options.sdk ? code : result.code;

			fs.writeFileSync(output, `/**!
 * File ${path.basename(output)} for "Your Radio"
 * 
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
` + writeCode + "\n", {encode: 'utf8'});
			const bcode = [
				'./node_modules/butterchurn-presets/lib/butterchurnPresets.min.js',
				'./node_modules/butterchurn-presets/lib/butterchurnPresetsExtra.min.js',
				'./node_modules/butterchurn-presets/lib/butterchurnPresetsExtra2.min.js',
				//'./node_modules/butterchurn/lib/butterchurn.js'
			].map(f => {
				return fs.readFileSync(f).toString();
			}).join('\n\n');
			const resultBc = await minify(bcode, {
					compress: true,
					mangle: false,
					sourceMap: false,
					output: {
						comments: false
					}
				});
			fs.writeFileSync(path.join(outputPath, 'butterchurn.js'), resultBc.code);
			log(colors.yellowBright(`Минимизация JS завершена`), true);
			breakLn();
			resolve();
		} catch(e) {
			reject(e);
		}
	});
};

module.exports = start;
