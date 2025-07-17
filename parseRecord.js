const fs = require('fs'),
	path = require('path');

function padLeft(str, numChars = 4, char = ' ') {
	return (Array.from({ length: numChars }).fill(char).join('') + str).slice(-1 * numChars)
}

function padRight(str, numChars = 4, char = ' ') {
	return (str + Array.from({ length: numChars }).fill(char).join('')).slice(0, numChars)
}
function getM3U8Item(name, url) {
	return `\r\n#EXTINF:-1,${name}\r\n${url}`;p
}

let mdFile = path.join(__dirname, `radio.md`),
	m3u8File = path.join(__dirname, `radio.m3u8`),
	readmeFile = path.join(__dirname, `README.md`),
	dataJsonFile = path.join(__dirname, `application`, `radio`, `data.json`),
	readmeString = fs.readFileSync(readmeFile, 'utf8');

fs.unlinkSync(mdFile);
fs.unlinkSync(m3u8File);
fs.unlinkSync(dataJsonFile);

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

const GETURLTOFILE = function(url, output) {
		return new Promise(function(resolve, reject){
			const options = new URL(url);
			const file = fs.createWriteStream(output);
			const https = require('node:https');
			https.get(options, function(response){
				if (response.statusCode !== 200) {
					console.error(`Произошла ошибка: сервер отдал статус ${response.statusCode}`);
					fs.unlinkSync(output);
					reject();
					return;
				}
				response.pipe(file);
			}).on('error', function(e){
				fs.unlinkSync(output);
				console.error(e);
				reject();
			});
			file.on('finish', () => {
				file.close(() => {
					resolve();
				});
			});
			file.on('error', (err) => {
				fs.unlinkSync(output);
				console.error(err.message);
				reject();
			});
		});
	},
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
	FAVICON = function(id){
		return new Promise(function(resolve, reject){
			const {exec} = require('child_process');
			let app = 'magick',
				name = path.normalize(path.join(__dirname, `${id}_icon.png`)),
				out = path.normalize(path.join(__dirname, `${id}_favicon.png`)),
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
	};
	
GETURLTOFILE('https://www.radiorecord.ru/api/stations/', 'record.json').then(async function(res){
	const s = fs.readFileSync ('record.json', {encoding: 'utf8'});
	const result = JSON.parse(s);
	fs.unlinkSync('record.json');
	const stations = result.result.stations;
	var obj = JSON.parse(fs.readFileSync('src/sources/data.json', 'utf8'));
	const playlist = obj.stations || {};
	/**
	 * Загрузка локальных станций из src/sources/stations
	 */
	let filesDir = path.join(__dirname, 'src/sources/stations');
	let files = fs.readdirSync(filesDir).filter(fn => fn.endsWith('.json')).map(file => path.join(filesDir, file));
	for(let f = 0; f < files.length; ++f){
		let fileStation = JSON.parse(fs.readFileSync(files[f], 'utf8'));
		let values = Object.values(fileStation)[0];
		playlist[Object.keys(fileStation)[0]] = Object.values(fileStation)[0];
		mdWrite.write(`\n| ${values.name} | ${values.stream} |`);
		m3u8Write.write(getM3U8Item(values.name, values.stream));
		let date = new Date();
		date.setTime(values.id);
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
		await GETURLTOFILE(icon, `${id}.png`);
		await MAGICK(`${id}.png`, 'big', true);
		let bigicon = fs.readFileSync(`${id}_big.png`, {encoding: 'base64'});
		await MAGICK(`${id}.png`, 'icon', false);
		await FAVICON(id);
		let favicon = fs.readFileSync(`${id}_favicon.png`, {encoding: 'base64'});
		fs.unlinkSync(`${id}.png`);
		fs.unlinkSync(`${id}_big.png`);
		fs.unlinkSync(`${id}_icon.png`);
		fs.unlinkSync(`${id}_favicon.png`);

		mdWrite.write(`\n| ${name} | ${stream} |`);
		m3u8Write.write(getM3U8Item(name, stream));

		playlist[id] = {
			"name": name,
			"stream": stream,
			"id": id,
			"favicon": `data:image/png;base64,${favicon}`,
			"image": `data:image/png;base64,${bigicon}`
		};
		console.log(name, "\n", date, id, stream, "\n");
	}
	obj.stations = playlist;

	fs.writeFileSync(dataJsonFile, JSON.stringify(obj, null, "\t"), {encoding: 'utf8'});

	mdWrite.write(`\n\n[Playlist](radio.m3u8)`);
	mdWrite.write(`\n\n`);
	mdWrite.end();
	m3u8Write.end();

	await delay(2000);

	let radioMD = fs.readFileSync(mdFile, 'utf8');
	const regex = /<!--BeginStations-->(.*)<!--EndStations-->/gs;
	const readme = readmeString.replace(/<!--BeginStations-->(.*)<!--EndStations-->/gs, `<!--BeginStations-->\n${radioMD}\n<!--EndStations-->`);
	fs.writeFileSync(readmeFile, readme, {encoding: 'utf8'});
}).catch(function(error){
	console.log(error);
});