const fs = require('fs'),
	path = require('path'),
	zlib = require('zlib'),
	colors = require('ansi-colors'),
	{ log, logTable, logStation, logError, breakLn } = require('./log.js'),
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/'),
	// Нас интересуют значения `true`, `1`, `yes`, `y`. Всё остальное пофиг - false
	allowed = ['true', '1', 'yes', 'y'],
	filesDir = getPath(`.`, `src`, `sources`, `stations`),
	// Functions
	toBoolean = function(bool) {
		// Конвертируем в строку, переводим в нижний регистр, очищаем от пустых символов
		return allowed.includes(String(bool).toLowerCase().trim());
	},
	// Удаление файлa, директории
	deleteFile = (...args) => {
		const file = getPath(...args);
		if(fs.existsSync(file)) {
			try {
				fs.rmSync(file, { recursive: true, force: true });
				//log(`Удалено: ${file}`, true);
			}catch(e){
				//log(`Не удалено: ${file}`, true);
			}
		} else {
			//log(`Не удалено: ${file}`, true);
		}
	},
	// Данные для плейлиста m3u8
	getM3U8Item = (name, url, genre = []) => {
		const gn = [...genre].join(", ");
		return`\r\n#EXTINF:-1,${name}${gn.length ? ' (' + gn + ')' : ''}\r\n${url}`;
	},
	// Данные для md файла
	getMDItem = (name, url, genre = [], length = 9) => {
		const gn = [...genre].map((e) => {return '`' + e + '`';}).join(", ");
		logStation({
			"Имя": name,
			"Жанр": genre.join(", "),
			"Стрим": url
		}, length);
		return `\n| 🌐‍🎧 | **${name}** | \`${url}\` | ${gn.length ? gn : '---'} |`;
	},
	// Пауза
	delay = ms => new Promise(resolve => setTimeout(resolve, ms)),
	// Получение файла по url
	getUrlToFile = (url, output) => {
		return new Promise((resolve, reject) => {
			const https = require('https');
			https.get(url, (res) => {
				if (res.statusCode !== 200) {
					return reject(`HTTP error ${res.statusCode}`);
				}
				const contentEncoding = (res.headers['content-encoding'] || '').toLowerCase();
				const isGzip = contentEncoding.includes('gzip');
				const chunks = [];
				res.on('data', chunk => chunks.push(chunk));
				res.on('end', () => {
					const buffer = Buffer.concat(chunks);
					var finalBuffer = buffer;
					if (isGzip) {
						try {
							finalBuffer = zlib.gunzipSync(buffer);
						} catch (e) {
							return reject('Не удалось распаковать gzip: ' + e.message);
						}
					}
					// Просто сохраняем результат (уже распакованный или нет) как файл
					fs.writeFile(output, finalBuffer, (err) => {
						if (err) {
							reject(err);
						} else {
							resolve(output);
						}
					});
				});
			}).on('error', reject);
		});
	},
	// Ресайз и окраска иконки для станций Radio Record
	magick = (input, sufix, arg) => {
		return new Promise((resolve, reject) => {
			var ls = null;
			const {exec} = require('child_process');
			const app = 'magick',
				id = path.basename(input, path.extname(input)),
				name = input,
				out = path.normalize(getPath(filesDir, 'build', `${id}_${sufix}.png`)),
				a = [
					`${app}`,
					`"${name}"`,
					'-fill',
					'"#FF6000"',
					'-colorize',
					'100',
					'-channel',
					'RGBA',
					'-fuzz',
					'5%',
					'-fill',
					'white',
					'-opaque',
					'None',
					'-alpha',
					'off',
					'-resize',
					'180x180'
				];
			if(arg){
				a.push('-gravity');
				a.push('center');
				a.push('-extent');
				a.push('360x180');
			}
			a.push(`"${out}"`);
			ls = exec(a.join(' '), (error, stdout, stderr) => {
				if (error) {
					logError(error);
					reject(error);
				} else if (stderr) {
					logError(stderr);
					reject(stderr);
				} else {
					resolve();
				}
			});
		});
	},
	// Генерируем иконку для станций Radio Records
	favicon = (id) => {
		return new Promise((resolve, reject) => {
			const {exec} = require('child_process');
			const directory = path.normalize('.'),
				app = 'magick',
				name = path.normalize(getPath(filesDir, 'build', `${id}_icon.png`)),
				out = path.normalize(getPath(filesDir, 'build', `${id}_favicon.png`)),
				args = [
					`${app}`,
					`"${name}"`,
					`-alpha`,
					`on`,
					`(`,
					`+clone`,
					`-threshold`,
					`-1`,
					`-negate`,
					`-fill`,
					`white`,
					`-draw`,
					`"circle 90,90 90,0"`,
					`)`,
					`-compose`,
					`copy_opacity`,
					`-composite`,
					`"${out}"`
				],
				ls = exec(args.join(` `), (error, stdout, stderr) => {
					if (error) {
						logError(error);
						reject(error);
					} else if (stderr) {
						logError(stderr);
						reject(stderr);
					} else {
						resolve();
					}
				});
		});
	},
	// Генерируем иконку для локальных станций
	favicon_local = (id, dir='') => {
		return new Promise((resolve, reject) => {
			const {exec} = require('child_process');
			const directory = dir != '' ? path.normalize(dir) : path.normalize(filesDir);
			const app = 'magick',
				name = path.normalize(getPath(directory, `${id}.png`)),
				temp = path.normalize(getPath(directory, 'build', `${id}_temp.png`)),
				out = path.normalize(getPath(directory, 'build', `${id}_favicon.png`)),
				args_temp = [
					`${app}`,
					`"${name}"`,
					`-background`,
					`transparent`,
					`-gravity`,
					`center`,
					`-extent`,
					`180x180`,
					`"${temp}"`
				],
				args = [
					`${app}`,
					`"${temp}"`,
					`-alpha`,
					`on`,
					`(`,
					`+clone`,
					`-threshold`,
					`-1`,
					`-negate`,
					`-fill`,
					`white`,
					`-draw`,
					`"circle 90,90 90,0"`,
					`)`,
					`-compose`,
					`copy_opacity`,
					`-composite`,
					`"${out}"`
				];
			exec(args_temp.join(` `), (error, stdout, stderr) => {
				if (error) {
					logError(error);
					reject(error);
				} else if (stderr) {
					logError(stderr);
					reject(stderr);
				} else {
					exec(args.join(` `), (err, stdo, stde) => {
						if (err) {
							logError(err);
							reject(err);
						} else if (stde) {
							logError(stde);
							reject(stde);
						} else {
							deleteFile(temp);
							resolve();
						}
					});
				}
			});
		});
	};

const mdFile = getPath(`.`, `radio.md`),
	m3u8File = getPath(`.`, `radio.m3u8`),
	readmeFile = getPath(`.`, `README.md`),
	dataJsonFile = getPath(`.`, `application`, `radio`, `data.json`),
	readmeString = fs.readFileSync(readmeFile, 'utf8');

// deleteFile(mdFile);
// deleteFile(m3u8File);

fs.mkdirSync(getPath(filesDir, 'build'), {recursive: true});

var mdWrite,
	m3u8Write;

const obj = {
		stations: {},
		active: 0,
		notify: true,
		volume: 1,
		genre: [],
		custombg: false
	},
	playlist = {},
	sets = new Set();

let select = false;


	// Парсинг Локальных станций
const parseLocales = (length = 9) => {
		return new Promise(async (resolve, reject) => {
			log(colors.yellowBright(`Парсинг Локальных станций`), true);
			breakLn();
			mdWrite = fs.createWriteStream(mdFile, {
				flag: 'a',
				autoClose: false,
				emitClose: false
			});
			m3u8Write = fs.createWriteStream(m3u8File, {
				flag: 'a',
				autoClose: false,
				emitClose: false
			});
			mdWrite.write(`\n|      | Station Name | Strem link | Genre |\n| ---- | ------------ | ---------- | ----- |`);

			m3u8Write.write(`#EXTM3U\r\n#PLAYLIST:Ваше Радио. Облегчённая версия.`);
			try {
				/**
				 * Загрузка локальных станций из src/sources/stations
				 */
				const files = fs.readdirSync(filesDir).filter(fn => fn.endsWith('.json')).map(file => path.join(filesDir, file));
				for(let f = 0; f < files.length; ++f){
					const fileStation = JSON.parse(fs.readFileSync(files[f], 'utf8'));
					/**
					 * Ключ станции
					 */
					const key = Object.keys(fileStation)[0];
					/**
					 * Значения станции
					 */
					var values = Object.values(fileStation)[0];
					values = Object.keys(values).sort().reduce((acc, key) => ({
						...acc, [key]: values[key]
					}), {});
					values.id = parseInt(key);
					if(!values.genre) {
						values.genre = [];
					}
					const genre = [...values.genre];
					values.genre.map((gn) => sets.add(gn));

					/**
					 * Проверяем есть ли изображение
					 * Если его нет - станцию не добавляем.
					 * Так проще отслеживать станции
					 * Именно по имени изображения
					 *
					 * Чтобы оставить изображение, но не добавлять станцию
					 * переименуем файл изображения добавив суфикс _delete
					 * Было 1752607042854.png Стало 1752607042854_delete.png
					 */
					if(!fs.existsSync(path.normalize(path.join(filesDir ,`${values.id}.png`)))) {
						console.log(values.name, "\n", colors.redBright(`Станция не добавлена`), colors.yellowBright(path.basename(files[f])), "\n");
						continue;
					}
					/**
					 * Обработка изображений
					 */
					await favicon_local(values.id);
					const bigicon = fs.readFileSync(path.normalize(path.join(filesDir ,`${values.id}.png`)), {encoding: 'base64'});
					const favicon_let = fs.readFileSync(path.normalize(path.join(filesDir, 'build', `${values.id}_favicon.png`)), {encoding: 'base64'});
					values.favicon = `data:image/png;base64,${favicon_let}`;
					values.image = `data:image/png;base64,${bigicon}`;
					await deleteFile(path.normalize(path.join(filesDir, 'build', `${values.id}_favicon.png`)));

					playlist[key] = values;
					/**
					 * Берём первую станцию если ещё нет
					 */
					if(!select) {
						select = values.id;
					}
					/**
					 * Пишем
					 */
					m3u8Write.write(getM3U8Item(values.name, values.stream, genre));
					mdWrite.write(getMDItem(values.name, values.stream, genre, length));
				}
				log(colors.yellowBright("Парсинг Локальных станций завершён"), true);
				breakLn();
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	},
	// Парсинг Radio Record
	parseStations = (length = 9) => {
		return new Promise((resolve, reject) => {
			getUrlToFile('https://www.radiorecord.ru/api/stations/', './record.json')
				.then((res) => recordParse(length).then(resolve).catch(reject))
				.catch(reject);
		});
	},
	/**
	 * Парсинг Radio Record
	 */
	recordParse = (length = 9) => {
		return new Promise(async (resolve, reject) => {
			try {
				const s = fs.readFileSync ('./record.json', {encoding: 'utf8'}).toString();
				const result = JSON.parse(s);
				const stations = result.result.stations;
				log(colors.yellowBright(`Парсинг станций Radio Record`), true);
				breakLn();
				for(let i = 0; i < stations.length; ++i){
					const station = stations[i];
					const [dateValues, timeValues] = station.updated.split(' ');
					const [day, month, year] = dateValues.split('.');
					const [hours, minutes, seconds] = timeValues.split(':');
					const icon = station.icon_fill_white;
					const stream = station.stream_320;
					const name = `Radio Record «${station.title}»`;
					const ms = (new Date()).getMilliseconds();
					const date = new Date(
						+year,
						+month - 1,
						+day,
						+hours,
						+minutes,
						+seconds
					);
					const id = date.getTime();
					const genre = station.genre.map((st) => st.name);
					/**
					 * Загружаем изображение для станции
					 */
					await getUrlToFile(icon, path.normalize(path.join(filesDir ,`${id}.png`))).catch((e) => {
						reject(e);
					});
					/**
					 * Генерируем картинки станции
					 */
					await magick(path.normalize(path.join(filesDir ,`${id}.png`)), 'big', true).catch((e) => {
						reject(e);
					});
					await magick(path.normalize(path.join(filesDir ,`${id}.png`)), 'icon', false).catch((e) => {
						reject(e);
					});
					await favicon(id).catch((e) => {
						reject(e);
					});
					/**
					 * Читаем полученные изображения
					 */
					const bigicon = fs.readFileSync(path.normalize(path.join(filesDir, 'build', `${id}_big.png`)), {encoding: 'base64'});
					const favicon_lt = fs.readFileSync(path.normalize(path.join(filesDir, 'build', `${id}_favicon.png`)), {encoding: 'base64'});
					/**
					 * Удаляем изображения
					 */
					await deleteFile(path.normalize(path.join(filesDir, `${id}.png`)));
					await deleteFile(path.normalize(path.join(filesDir, 'build', `${id}_icon.png`)));
					await deleteFile(path.normalize(path.join(filesDir, 'build', `${id}_favicon.png`)));
					await deleteFile(path.normalize(path.join(filesDir, 'build', `${id}_big.png`)));
					/**
					 * Пишем список и плейлист
					 */
					m3u8Write.write(getM3U8Item(name, stream));
					mdWrite.write(getMDItem(name, stream, genre, length));
					genre.map((gn) => sets.add(gn));
					/**
					 * Формируем станцию
					 */
					playlist[id] = {
						"favicon": `data:image/png;base64,${favicon_lt}`,
						"genre": genre,
						"id": id,
						"image": `data:image/png;base64,${bigicon}`,
						"name": name,
						"stream": stream,
					};
				}
				log(colors.yellowBright("Парсинг Radio Record завершён"), true);
				breakLn();
				resolve();
			} catch(error) {
				reject(error);
			}
		});
	},
	writeEnd = () => {
		// Этот код 
		// Назначаем станции для конфигурации
		obj.stations = playlist;
		// Указываем самую первую станцию из плейлиста
		obj.active = select;
		// Указываем используемые жанры
		obj.genre = [...sets];

		const globData = Object.keys(obj).sort().reduce((acc, key) => ({
			...acc,
			[key]: obj[key]
		}), {});

		// Сохраняем конфигурацию
		fs.writeFileSync(dataJsonFile, JSON.stringify(globData), {encoding: 'utf8'});

		mdWrite.write(`\n\n[🌐‍🎧 Плейлист M3U8](https://github.com/ProjectSoft-STUDIONIONS/NewYourRadio/blob/main/radio.m3u8?raw=true)`);
		mdWrite.write(`\n\n`);

		mdWrite.end();
		m3u8Write.end();
		// Перезаписываем README.md
		const radioMD = fs.readFileSync(mdFile, 'utf8');
		const regex = /<!--BeginStations-->(.*)<!--EndStations-->/gs;
		const readme = readmeString.replace(/<!--BeginStations-->(.*)<!--EndStations-->/gs, `<!--BeginStations-->\n${radioMD}\n<!--EndStations-->`);
		fs.writeFileSync(readmeFile, readme, {encoding: 'utf8'});
		deleteFile(mdFile);
		fs.rmSync(getPath(filesDir, 'build'), {recursive: true});
	},
	start = (length = 9) => {
		return new Promise((resolve, reject) => {
			// Сначала локальные
			parseLocales(length).then(() => {
				// Далее Radio Record
				parseStations(length).then(async () => {
					// Ну а деалее могут быть ещё станции со своим API
					// ......................
					// writeEnd и resolve переносить если будут другие API
					writeEnd();
					resolve();
				}).catch(reject)
			}).catch(reject);
		});
	};

module.exports = start;
