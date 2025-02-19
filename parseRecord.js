function padLeft(str, numChars = 4, char = ' ') {
	return (Array.from({ length: numChars }).fill(char).join('') + str).slice(-1 * numChars)
}

function padRight(str, numChars = 4, char = ' ') {
	return (str + Array.from({ length: numChars }).fill(char).join('')).slice(0, numChars)
}

let md = `| Station Name | Strem link |
| ------------------- | ------------------- |`;
const fs = require('fs'),
	path = require('path'),
	GETURLTOFILE = function(url, output) {
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
	for(let i = 0; i < stations.length - 1; ++i){
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
		md += `\n| ${name} | ${stream} |`;
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
	fs.writeFileSync('application/radio/data.json', JSON.stringify(obj, null, "\t"), {encoding: 'utf8'});
	fs.writeFileSync('radiorecord.md', md, {encoding: 'utf8'});
}).catch(function(error){
	console.log(error);
});