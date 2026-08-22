const colors = require('ansi-colors'),
	// Нас интересуют значения `true`, `1`, `yes`, `y`. Всё остальное пофиг - false
	allowed = ['true', '1', 'yes', 'y'],
	maxLength = 9,
	toBoolean = function(bool) {
		// Конвертируем в строку, переводим в нижний регистр, очищаем от пустых символов
		return allowed.includes(String(bool).toLowerCase().trim());
	}
	log = {
		logTable: obj => {
			if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
				log.logError('Ожидается обычный объект (не массив)');
				return;
			}
			const repeat = (text, width) => text.repeat(width);
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
				log.log(colors.cyan(`\u2502`) + ` ${colors.yellowBright(padKey(key))} ` + colors.cyan(`\u2502`)+ ` ${ String(value).trim() !== '' ? colors.cyanBright(padVal(String(value))) : colors.redBright('НЕ ЗАДАНО') } ` + colors.cyan(`\u2502`));
			});
			log.log(separatorEnd);
			log.breakLn();
		},
		logStation: (obj, length = 9) => {
			if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
				log.logError('Ожидается обычный объект (не массив)');
				return;
			}
			const entries = Object.entries(obj);
			if (entries.length === 0) {
				log.log('Пустой объект');
				return;
			}
			const maxKeyLen = Math.max(length, ...entries.map(([k]) => k.length));
			const padKey = (k) => String(k).padStart(maxKeyLen).replace(k, colors.underline(k));
			entries.forEach(([key, value]) => {
				const name = key.toLowerCase();
				let method;
				switch (name) {
					case "имя":
					case "name":
						method = "cyanBright";
						break;
					case "жанр":
					case "genre":
						method = "yellow";
						break;
					case "стрим":
					case "url":
						method = "cyan";
						break;
					default:
						method = "greenBright";
				}
				log.log(`${(colors.yellowBright(padKey(key)) + ": ") + (String(value).trim() !== '' ? colors[method](colors.underline(String(value))) : colors.redBright(colors.underline('НЕ ЗАДАНО'))) }`);
			});
			log.breakLn();
		},
		logError: text =>  {
			console.error(text);
		},
		log: (text, ok = false) => {
			text = ((ok ? `\u00a0\u00a0` : `\u00a0\u00a0\u00a0`) + text + `\u00a0`);
			toBoolean(ok) ? console.log(colors.green(">") + text) : console.log(text);
		},
		breakLn: () => console.log("\u00a0"),
	};
module.exports = log;
