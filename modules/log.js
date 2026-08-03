const grunt = require('grunt');
const colors = require('ansi-colors'),
	log = {
		logTable: obj => {
			if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
				log.logError('Ожидается обычный объект (не массив)');
				return;
			}
			const repeat = (text, width) => {
				return text.repeat(width);
			};
			const entries = Object.entries(obj);
			if (entries.length === 0) {
				log.log('Пустой объект');
				return;
			}
			const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
			const maxValLen = Math.max(...entries.map(([, v]) => String(v).length));
			const padKey = (k) => String(k).padStart(maxKeyLen);
			const padVal = (v) => String(v).padEnd(maxValLen);
			const separatorStart = colors.cyan('\u250c' + repeat('\u2014', maxKeyLen + 2) + '\u252c' + repeat('\u2014', maxValLen + 2) + '\u2510');
			const separatorEnd = colors.cyan('\u2514' + repeat('\u2014', maxKeyLen + 2) + '\u2534' + repeat('\u2014', maxValLen + 2) + '\u2518');
			log.log(separatorStart);
			entries.forEach(([key, value]) => {
				log.log(colors.cyan(`\u2502`) + ` ${colors.yellowBright(padKey(key))} ` + colors.cyan(`\u2502`)+ ` ${ value.trim() !== '' ? colors.cyanBright(padVal(value)) : colors.redBright('НЕ ЗАДАНО') } ` + colors.cyan(`\u2502`));
			});
			log.log(separatorEnd);
			log.breakLn();
		},
		logStation: obj => {
			if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
				log.logError('Ожидается обычный объект (не массив)');
				return;
			}
			const entries = Object.entries(obj);
			if (entries.length === 0) {
				log.log('Пустой объект');
				return;
			}
			const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
			const padKey = (k) => String(k).padStart(maxKeyLen).replace(k, colors.underline(k));
			entries.forEach(([key, value]) => {
				let name = key.toLowerCase();
				let method;
				switch (name) {
					case "имя":
					case "name":
						method = "cyanBright";
						break;
					case "genre":
					case "жанр":
						method = "yellow";
						break;
					case "url":
					case "стрим":
						method = "cyan";
						break;
					default:
						method = "yellowBright";
				}
				log.log(`${(colors.yellowBright(padKey(key)) + ": ") + (value.trim() !== '' ? colors[method](colors.underline(value)) : colors.redBright(colors.underline('НЕ ЗАДАНО'))) }`);
			});
			log.breakLn();
		},
		logError: text => grunt.fail.fatal(`\u00a0\u00a0\u00a0` + text + `\u00a0`, 1),
		log: (text, ok = false) => {
			let str = `\u00a0\u00a0\u00a0` + text + `\u00a0`;
			Boolean(ok) ? grunt.log.ok([str]) : grunt.log.writeln([str]);
		},
		breakLn: () => grunt.log.writeln(""),
	};
module.exports = log;
