module.exports = function(options) {
	const fs = require("fs");
	const path = require("path");
	const { rcedit } = require("rcedit");
	const colors = require('ansi-colors');
	const pack = require(path.join(__dirname, '..', 'package.json'));
	const { log, logTable, logStation, logError, breakLn } = require('./log.js');

	return new Promise(async function(resolve, reject){
		//const app = require('./application/package.json');
		const rcEditOptions = {
			"icon": "application/favicon.ico",
			"file-version": options.version,
			"product-version": options.version,
			"version-string": {
				"Comments": options.comments,
				"CompanyName": "ProjectSoft",
				"FileDescription": options.description,
				"FileVersion": options.version,
				"InternalName": options.name,
				"LegalCopyright": "ProjectSoft",
				"LegalTrademarks": "ProjectSoft",
				"OriginalFilename": options.name,
				"PrivateBuild": options.name,
				"ProductName": "Ваше Радио. Облегчённая версия.",
				"ProductVersion": options.version,
				"SpecialBuild": options.name,
			},
		};
		// Редактируем ресурсы в nw.exe
		log(colors.yellowBright(`Редактируем nw.exe`), true);
		breakLn();
		rcedit('build/nw.exe', rcEditOptions).then( async data => {
			// Переименовываем nw.exe в YourRadio.exe
			log(colors.yellowBright(`Переименовываем nw.exe в ${pack.exeName}.exe`), true);
			breakLn();
			await fs.renameSync('build/nw.exe', `build/${pack.exeName}.exe`);
			fs.writeFileSync('./application/package.json', JSON.stringify(options, null, "\t"));
			// Редактируем ресурсы в nw.dll
			log(colors.yellowBright(`Редактируем nw.dll`), true);
			breakLn();
			rcedit('build/nw.dll', {
				"icon": "application/favicon.ico",
			}).then(async data => {
				log(colors.yellowBright(`Редактирование завершено`), true);
				breakLn();
				resolve();
			}).catch( e => {
				reject(e);
			} );
		}).catch( e => {
			reject(e);
		} );
	});
};
