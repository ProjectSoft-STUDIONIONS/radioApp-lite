/**!
 * .env
 * 
 * DOTENV_CONFIG_* - Конфигурация для dotenv. Её лучше не трогать!
 * 
 * DOTENV_CONFIG_DEBUG=0
 * DOTENV_CONFIG_QUIET=1
 * DOTENV_CONFIG_ENCODING=utf8
 * 
 * NWJS_* - Настройки для nwjs
 * 
 * NWJS_TARGET         0 или 1. 0 - normal версия
 *                              1 - sdk версия.
 * NWJS_UPDATE         0 или 1. 0 - не обновлять.
 *                                  При этом в .cache должен присутствовать msnifest.json с данными
 *                                  и должна присутствовать версия под которую компилируется.
 *                              1 - обновлять.
 *                                  Первый запуск именно с 1.
 *                                  Также 1 при смене NWJS_TARGET
 * NWJS_VERSION        0 или 1. 0 - забирается последняя версия из .cache/manifest.json
 *                              0.115.0 - Будет забираться именно эта версия nwjs
 * 
 * Настройка парсинга станций
 * 
 * RECORD              0 или 1. 0 - не обновлять.
 *                                  Уже присутствует application/radio/data.json
 *                              1 - обновлять.
 *                                  Обновляются все данные в application/radio/data.json
 * Настройка форматирования
 * 
 * MAX_LENGTH=15       Длина форматирования заголовка сообщения.
 * 
 * 
 * Так же должен быть установлен ImageMagick https://imagemagick.org/download/#windows
 * 
 **/

process.on('unhandledRejection', (reason, promise) => {
	if (reason instanceof Error) {
		console.error(colors.redBright(`   ${reason.name}:`), `${reason.message}`);
	} else {
		console.error(colors.redBright('   Неожиданная ошибка:'), String(reason));
	}
	process.exit(1);
});

let options = {};
const fs = require('fs'),
	path = require('path'),
	config = require('dotenv').config(),
	pack = require('./package.json'),
	{ rcedit } = require('rcedit'),
	colors = require('ansi-colors'),
	{ log, logTable, logStation, logError, breakLn } = require('./modules/log.js'),
	parseStations = require('./modules/parse-record.js'),
	Downloader = require('./modules/Downloader.js'),
	ttf2woff2 = require('./modules/ttf2woff2-convert.js'),
	less2css = require('./modules/less2css.js'),
	uglifyjs = require('./modules/uglify-js.js'),
	pugjs = require('./modules/pug-js.js'),
	rcEdit = require('./modules/rcedit.js'),
	zip = require('./modules/zip.js'),
	terser = require('./modules/terser.js'),
	webfont = require('./modules/webfont.js'),
	innosetup = require('./modules/innosetup.js'),
	mainPackage = require('./package.json'),
	appPackage = require('./application/package.json'),
	maxLength = 9,
	sleep = (ms) => {
		return new Promise(resolve => setTimeout(resolve, ms));
	},
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/'),
	deleteFile = (...args) => {
		const file = getPath(...args);
		if(fs.existsSync(file)) {
			try {
				fs.rmSync(file, { recursive: true, force: true });
			}catch(e){
				throw [ deleteFile.name, e ];
			}
		}
	},
	months = [
		'January', 'February', 'March',     'April',   'May',      'June',
		'July',    'August',   'September', 'October', 'November', 'December'
	],
	buildDate = () => {
		const date = new Date();
		const d = date.getDate();
		const m = months[date.getMonth()];
		const y = date.getFullYear();
		const h = String(date.getHours()).padStart(2, '0');
		const min = String(date.getMinutes()).padStart(2, '0');
		const sec = String(date.getSeconds()).padStart(2, '0');
		return `${d} ${m} ${y} ${h}:${min}:${sec}`;
	},
	copyFolders = (input, output) => {
		try {
			fs.mkdirSync(output, { recursive: true, force: true });
			fs.cpSync(input, output, { recursive: true, force: true, filter: function(src, dest) {
				log(colors.yellowBright("Копирование".padStart(options.maxLength)) + ": " + colors.cyanBright(getPath(dest)));
				return true;
			} })
		}catch(e){
			throw [ copyFolders.name, e ];
		}
	},
	copyBuild = async () => {
		// Копируем в build
		try {
			log(colors.yellowBright(`Подготовка директории build`), true);
			breakLn();
			fs.mkdirSync(getPath('.', 'build'));
			copyFolders(getPath('.', '.cache', options.sdk ? 'sdk' : 'normal', options.tempvers), getPath('.', 'build'));
			// Удаление ненужного из locales
			fs.readdirSync(getPath('.', 'build', 'locales'))
				.filter(f => !/^[^_]+\.pak$/.test(f))
				.map(f => {
					const fl = getPath('.', 'build', 'locales', f);
					fs.unlinkSync(fl);
					log(colors.yellowBright(`Удаление`.padStart(options.maxLength)) + ": " + colors.cyanBright(fl))
				});
			// Удаление ненужного из build
			fs.readdirSync(getPath('.', 'build'))
				.filter(f => /^vulkan*|^vk_swiftshader*/.test(f))
				.map(f => {
					const fl = getPath('.', 'build', f);
					fs.unlinkSync(fl);
					log(colors.yellowBright(`Удаление`.padStart(options.maxLength)) + ": " + colors.cyanBright(fl))
				})
			breakLn();
			log(colors.yellowBright(`Подготовка завершена`), true);
			breakLn();
		}catch(e) {
			throw [ copyBuild.name, e ];
		}
	},
	copyLocales = () => {
		// Копирование _locales
		// Минификация JSON
		log(colors.yellowBright(`Компиляция _locales`), true);
		breakLn();
		// Удаляем _locales
		fs.rmSync(getPath('.', 'application/_locales'), { recursive: true, force: true });
		// Копируем 
		fs.readdirSync(getPath('.', 'src', '_locales')).filter(f1 => {
			try {
				fs.readdirSync(getPath('.', 'src', '_locales', f1)).filter(f2 => {
					if(f2 == "messages.json") {
						fs.mkdirSync(getPath('.', 'application/_locales', f1), { recursive: true, force: true });
						const file = getPath('.', 'src', '_locales', f1, f2);
						const appLocales = getPath('.', 'application/_locales', f1, f2);
						const json = fs.readFileSync(file).toString();
						const minifyJson = JSON.stringify(JSON.parse(json));
						fs.writeFileSync(appLocales, minifyJson + "\n");
						log(colors.yellowBright("Запись".padStart(options.maxLength)) + ": " + colors.cyanBright(appLocales));
					}
				})
			} catch (e) {
				//
			}
		});
		// Далее копируем en/messages.json в директории языка, перебирая директории по названию файлов в build/locales
		// Фильтруем от ненужных файлов
		const json = fs.readFileSync(getPath('.', 'src', '_locales', 'en', 'messages.json')).toString();
		const minifyJson = JSON.stringify(JSON.parse(json));
		fs.readdirSync(getPath('.', 'build', 'locales')).filter(f => /^[^_]+\.pak$/.test(f)).map(f => {
			// Получаем имя файла без расширения
			const name = path.basename(f, '.pak');
			const appLocales = getPath('.', 'application', '_locales', name, 'messages.json');
			if(!fs.existsSync(appLocales)) {
				fs.mkdirSync(getPath('.', 'application', '_locales', name), { recursive: true, force: true });
				fs.writeFileSync(appLocales, minifyJson + "\n");
				log(colors.yellowBright("Запись".padStart(options.maxLength)) + ": " + colors.cyanBright(appLocales));
			}
		});
		breakLn();
		log(colors.yellowBright(`Компиляция _locales завершено`), true);
		breakLn();
	},
	start = async () => {
		// Удаляем build
		deleteFile(getPath('.', 'build'));
		// Удаляем директорию setup
		fs.rmSync(getPath('.', 'setup'), { recursive: true, force: true });
		/**
		 * Сначало собираем данные из Интернета
		 * согласно настроек запуска сборки
		 */
		// Качаем
		await Downloader(config.parsed).then((obj) => {
			options = Object.assign(options, obj);
			logTable(options);
		}).catch((err) => {
			throw err;
		});
		//console.log(appPackage);
		appPackage.version = [mainPackage.version, options.tempvers].join(".");
		fs.writeFileSync('./application/package.json', JSON.stringify(appPackage, null, "\t") + "\n", { encoding: 'utf8' });
		fs.writeFileSync('./version.iss', `#define RadioAppVersion "${appPackage.version}"`, { encoding: 'utf8' });
		// #define RadioAppVersion "3.1.7"
		/**
		 * Данные в options получены
		 * Дальше работаетм с полученными данными
		 * Копмрование, сборка, упаковка приложения в package.nw, упаковка в исталяцию
		 */
		// Копируем в build
		copyBuild();
		// Сборка
		// Парсинг станций
		if (options.record) {
			await parseStations(options.maxLength);
		}else if(!fs.existsSync(getPath('.', 'application', 'radio', 'data.json'))){
			// Если файла нет - сделаем парсинг
			await parseStations(options.maxLength);
		}
		// Копирование images
		log(colors.yellowBright(`Копирование images`), true);
		breakLn();
		copyFolders(getPath('.', 'src', 'images'), getPath('.', 'application', 'images'));
		// Копирование images
		breakLn();
		log(colors.yellowBright(`Копирование images завершено`), true);
		breakLn();
		// Копирование _locales
		copyLocales();
		// ttf2woff2
		await ttf2woff2(options).then(() => {}).catch(e => {
			throw [ttf2woff2.name, e];
		});
		// webfont
		await webfont({
			fontName: "yourradio",
			formats: ["woff2"],
			template: getPath('src', 'template', 'template.less'),
			templateFontName: "Your Radio",
			templateClassName: "icon",
			templateFontPath: '/fonts/',
			files: "./src/glyph/*.svg",
		}).then((result) => {
			//console.log(result);
			const fontFileName = result.config.fontName
				.toLowerCase()                 // всё в нижний регистр
				.replace(/\s+/g, '')           // пробелы -> убрать
				.replace(/[^a-z0-9-]/g, '');   // убрать всё лишнее (точки, скобки и т.п.)
			const less = result.template.replace(/FONT_FILE/g, fontFileName);
			fs.mkdirSync('application/fonts', {recursive: true});
			fs.mkdirSync('temp/less', {recursive: true});
			fs.writeFileSync('src/less/fonts/yourradio.less', less);
			fs.writeFileSync('application/fonts/yourradio.woff2', result.woff2);
		}).catch(e => {
			throw [webfont.name, e];
		});
		// less2css
		await less2css(options).then(() => {}).catch(e => {
			throw [less2css.name, e];
		});
		// uglifyjs
		await uglifyjs(options).then(() => {}).catch(e => {
			throw [uglifyjs.name, e];
		});
		// Минимизация modules
		await terser({
			src: getPath('.', 'src', 'modules'),
			dest: getPath('.', 'application', 'modules')
		}).then(() => {}).catch(e => {
			throw [terser.name, e];;
		});
		// pugjs
		await pugjs(options).then(() => {}).catch(e => {
			throw [pugjs.name, e];
		});
		// zip
		await zip(options).then(() => {}).catch(e => {
			throw [zip.name, e];
		});
		// rcedit
		await rcEdit(appPackage).then(() => {}).catch(e => {
			throw [rcEdit.name, e];
		});
		if(!options.sdk) {
			// Если sdk==false то производим компиляцию установочного файла
			await innosetup(getPath('.', 'setup.iss'), {
				verbose: true,
			}).then(() => {}).catch(e => {
				throw [innosetup.name, e];
			});
		}
	};

(async () => {
	try {
		appPackage.buildDate = buildDate();
		fs.writeFileSync(getPath('.', 'application/package.json'), JSON.stringify(appPackage, null, "\t"));
		breakLn();
		await start();
		log(colors.yellowBright(`Сборка завершена`), true);
		breakLn();
	} catch (err) {
		// Не пускаем через logError!
		console.error(`Ошибка сборки:`, err);
		process.exit(1);
	}
})();
