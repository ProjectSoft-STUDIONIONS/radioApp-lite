const fs = require('fs'),
	path = require('path'),
	innosetup = require('innosetup-compiler/lib/iscc.js'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	colors = require('ansi-colors');

const start = (scriptPath, options) => {
	return new Promise((resolve, reject) => {
		log(colors.yellowBright(`Компиляция Установочного файла. Пожалуйста подождите...`), true);
		breakLn();
		options.gui = false;
		innosetup(scriptPath, options).then(() => {
			breakLn();
			log(colors.yellowBright(`Компиляция Установочного файла завершена`), true);
			breakLn();
			resolve();
		}).catch((err) => {
			reject(err);
		});
	});
}

module.exports = start;
