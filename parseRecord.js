const fs = require('fs'),
	path = require('path'),
	colors = require('ansi-colors');

process.stdout.write('\033c');

function deleteFile(file) {
	try {
		fs.unlinkSync(file);
	}catch(e){}
	return true;
}

function getM3U8Item(name, url) {
	return `\r\n#EXTINF:-1,${name}\r\n${url}`;
}

function getMDItem (name, url) {
	return `\n| ${name} | ${url} |`;
}

let mdFile = path.join(__dirname, `radio.md`),
	m3u8File = path.join(__dirname, `radio.m3u8`),
	readmeFile = path.join(__dirname, `README.md`),
	dataJsonFile = path.join(__dirname, `application`, `radio`, `data.json`),
	readmeString = fs.readFileSync(readmeFile, 'utf8');

deleteFile(mdFile);
deleteFile(m3u8File);
deleteFile(dataJsonFile);

let mdWrite = fs.createWriteStream(mdFile, {
		flag: 'a',
		autoClose: false,
		emitClose: false
	}),
	m3u8Write = fs.createWriteStream(m3u8File, {
		flag: 'a',
		autoClose: false,
		emitClose: false
	});

mdWrite.write(`| Station Name | Strem link |
| ------------------- | ------------------- |`);
m3u8Write.write(`#EXTM3U
#PLAYLIST:Ваше Радио. Облегчённая версия.`);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Закачка изображения
 */
const GETURLTOFILE = function(url, output) {
		return new Promise(function(resolve, reject){
			const options = new URL(url);
			const file = fs.createWriteStream(output);
			const https = require('node:https');
			https.get(options, function(response){
				if (response.statusCode !== 200) {
					console.error(`Произошла ошибка: сервер отдал статус ${response.statusCode}`);
					deleteFile(output);
					reject();
					return;
				}
				response.pipe(file);
			}).on('error', function(e){
				deleteFile(output);
				console.error(e);
				reject();
			});
			file.on('finish', () => {
				file.close(() => {
					resolve();
				});
			});
			file.on('error', (err) => {
				deleteFile(output);
				console.error(err.message);
				reject();
			});
		});
	},
	/**
	 * Ресайз и окраска иконки для cnfywbb Radio Record
	 */
	MAGICK = function(input, sufix, arg) {
		return new Promise(function(resolve, reject){
			const {exec} = require('child_process');
			let app = 'magick',
				id = input.split('.')[0],
				name = path.normalize(path.join(__dirname, input)),
				out = path.normalize(path.join(__dirname, `${id}_${sufix}.png`)),
				ls,
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
					reject(error);
				} else if (stderr) {
					reject(stderr);
				} else {
					resolve();
				}
			});
		});
	},
	/**
	 * Генерируем иконку для станций Radio Records
	 */
	FAVICON = function(id){
		return new Promise(function(resolve, reject){
			const {exec} = require('child_process');
			let directory = path.normalize(__dirname);
			let app = 'magick',
				name = path.normalize(path.join(directory, `${id}_icon.png`)),
				out = path.normalize(path.join(directory, `${id}_favicon.png`)),
				args = `${app} "${name}" -alpha on ( +clone -threshold -1 -negate -fill white -draw "circle 90,90 90,0" ) -compose copy_opacity -composite "${out}"`,
				ls = exec(args, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else if (stderr) {
						reject(stderr);
					} else {
						resolve();
					}
				});
		});
	},
	/**
	 * Генерируем иконку для локальных станций
	 */
	FAV_ICON = function(id, dir=''){
		return new Promise(function(resolve, reject){
			const {exec} = require('child_process');
			let directory = dir != '' ? path.normalize(dir) : path.normalize(__dirname);
			let app = 'magick',
				name = path.normalize(path.join(directory, `${id}.png`)),
				temp = path.normalize(path.join(directory, `${id}_temp.png`)),
				out = path.normalize(path.join(directory, `${id}_favicon.png`)),
				args_temp = `${app} "${name}" -background transparent -gravity center -extent 180x180 "${temp}"`,
				args = `${app} "${temp}" -alpha on ( +clone -threshold -1 -negate -fill white -draw "circle 90,90 90,0" ) -compose copy_opacity -composite "${out}"`;
			exec(args_temp, (error, stdout, stderr) => {
				if (error) {
					reject(error);
				} else if (stderr) {
					reject(stderr);
				} else {
					exec(args, (err, stdo, stde) => {
						if (err) {
							reject(err);
						} else if (stde) {
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
	
GETURLTOFILE('https://www.radiorecord.ru/api/stations/', 'record.json').then(async function(res){
	const s = fs.readFileSync ('record.json', {encoding: 'utf8'});
	const result = JSON.parse(s);
	deleteFile('record.json');
	const stations = result.result.stations;
	let obj = JSON.parse(fs.readFileSync('src/sources/data.json', 'utf8')),
	select = false;
	const playlist = obj.stations || {};
	/**
	 * Загрузка локальных станций из src/sources/stations
	 */
	let filesDir = path.join(__dirname, 'src', 'sources', 'stations');
	let files = fs.readdirSync(filesDir).filter(fn => fn.endsWith('.json')).map(file => path.join(filesDir, file));
	for(let f = 0; f < files.length; ++f){
		let fileStation = JSON.parse(fs.readFileSync(files[f], 'utf8'));
		/**
		 * Ключ станции
		 */
		let key = Object.keys(fileStation)[0];
		/**
		 * Значения станции
		 */
		let values = Object.values(fileStation)[0];
		mdWrite.write(`\n| ${values.name} | ${values.stream} |`);
		m3u8Write.write(getM3U8Item(values.name, values.stream));
		let date = new Date();
		date.setTime(values.id);
		/**
		 * Обработка изображений
		 */
		if(!values.favicon) {
			await FAV_ICON(values.id, path.normalize(filesDir));
			let bigicon = fs.readFileSync(path.normalize(path.join(filesDir ,`${values.id}.png`)), {encoding: 'base64'});
			let favicon = fs.readFileSync(path.normalize(path.join(filesDir ,`${values.id}_favicon.png`)), {encoding: 'base64'});
			values.favicon = `data:image/png;base64,${favicon}`;
			values.image = `data:image/png;base64,${bigicon}`;
			await deleteFile(path.normalize(path.join(filesDir ,`${values.id}_favicon.png`)));
		}
		playlist[key] = values;
		/**
		 * Берём первую станцию если ещё нет
		 */
		if(!select) {
			select = values.id;
		}
		console.log(values.name, "\n", date, values.id, values.stream, "\n");
	}
	/**
	 * Парсинг Radio Record
	 */
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
		/**
		 * Загружаем изображение для станции
		 */
		await GETURLTOFILE(icon, `${id}.png`);
		/**
		 * Генерируем картинки станции
		 */
		await MAGICK(`${id}.png`, 'big', true);
		await MAGICK(`${id}.png`, 'icon', false);
		await FAVICON(id);
		/**
		 * Читаем полученные изображения
		 */
		let bigicon = fs.readFileSync(`${id}_big.png`, {encoding: 'base64'});
		let favicon = fs.readFileSync(`${id}_favicon.png`, {encoding: 'base64'});
		/**
		 * Удаляем изображения
		 */
		await deleteFile(`${id}.png`);
		await deleteFile(`${id}_icon.png`);
		await deleteFile(`${id}_favicon.png`);
		await deleteFile(`${id}_big.png`);
		/**
		 * Пишем список и плейлист
		 */
		mdWrite.write(getMDItem(name, stream));
		m3u8Write.write(getM3U8Item(name, stream));
		/**
		 * Формируем станцию
		 */
		playlist[id] = {
			"name": name,
			"stream": stream,
			"id": id,
			"favicon": `data:image/png;base64,${favicon}`,
			"image": `data:image/png;base64,${bigicon}`
		};
		/**
		 * Берём первую станцию если ещё нет
		 */
		if(!select) {
			select = id;
		}
		console.log(name, "\n", date, id, stream, "\n");
	}
	/**
	 * Назначаем станции для конфигурации
	 */
	obj.stations = playlist;
	/**
	 * Указываем самую первую станцию из плейлиста
	 */
	obj.active = select;
	/**
	 * Сохраняем конфигурацию
	 */
	fs.writeFileSync(dataJsonFile, JSON.stringify(obj, null, "\t"), {encoding: 'utf8'});

	mdWrite.write(`\n\n[Playlist](radio.m3u8)`);
	mdWrite.write(`\n\n`);

	mdWrite.end();
	m3u8Write.end();
	/**
	 * Пауза для закрытия файлов
	 */
	await delay(1000);
	/**
	 * Перезаписываем README.md
	 */
	let radioMD = fs.readFileSync(mdFile, 'utf8');
	const regex = /<!--BeginStations-->(.*)<!--EndStations-->/gs;
	const readme = readmeString.replace(/<!--BeginStations-->(.*)<!--EndStations-->/gs, `<!--BeginStations-->\n${radioMD}\n<!--EndStations-->`);
	fs.writeFileSync(readmeFile, readme, {encoding: 'utf8'});
	await deleteFile(mdFile);
	console.log("\n", colors.yellowBright("DONE!"), "\n");
}).catch(function(error){
	console.log(error);
});