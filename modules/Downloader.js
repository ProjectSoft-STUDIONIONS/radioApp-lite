const fs = require("fs");
const path = require("path");
const cliProgress = require('cli-progress');
const _colors = require('ansi-colors');
const { log, logTable, logStation, logError, breakLn } = require('./log.js');
const unzipper = require("unzipper");
const allowed = ['true', '1', 'yes', 'y'];
// Конвертируем в строку, переводим в нижний регистр, очищаем от пустых символов
const toBoolean = (bool) => allowed.includes(String(bool).toLowerCase().trim());
// Уникальное значение
const uniqid = () => URL.createObjectURL(new Blob([])).slice(-36).replace(/-/g, '');

let options = {};

const formatTime = function(value){
		function autopadding(v){
			return ("0" + v).slice(-2);
		}
		const s = autopadding(Math.floor((value / 1000) % 60));
		const m = autopadding(Math.floor((value / 1000 / 60) % 60));
		const h = autopadding(Math.floor((value / (1000 * 60 * 60)) % 24));
		return h + ":" + m + ":" + s
	},
	autopaddingVal = function (value, length, opt){
		return (opt.autopaddingChar + value).slice(-length);
	},
	formatBytes = function(bytes, decimals = 2) {
		if (bytes === 0) return '0 Bt';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bt', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat(bytes / Math.pow(k, i)).toFixed(dm) + ' ' + sizes[i];
	},
	formatBar = function(optionsBar, paramsBar, payloadBar){
		function autopadding(value, length){
			return (optionsBar.autopaddingChar + value).slice(-length);
		}
		const completeSize = Math.round(paramsBar.progress * optionsBar.barsize);
		const incompleteSize = optionsBar.barsize - completeSize;
		const bar = optionsBar.barCompleteString.substr(0, completeSize) +
				optionsBar.barGlue +
				optionsBar.barIncompleteString.substr(0, incompleteSize);
		const percentage =  Math.floor(paramsBar.progress * 100) + '';
		const formatValue = formatBytes(paramsBar.value);
		const formatTotal = formatBytes(paramsBar.total);
		const total = formatTotal.length;// params
		const stopTime = paramsBar.stopTime || Date.now();
		const elapsedTime = formatTime(Math.round((stopTime - paramsBar.startTime)));
		var barStr = _colors.white('   |') + _colors.cyan(bar + ' ' + autopadding(percentage, 3) + '%') + "  " + _colors.white('|') + "  " + elapsedTime;
		return barStr;
	},
	rightpad = function(str, len, ch = false) {
		str = String(str);
		if (!ch && ch !== 0)
				ch = ' ';
		return str.padEnd(len, ch);
	},
	getPath = (...args) => path.join(...args).replace(/[\\]+/g, '/'),
	deleteDir = (...args) => {
		const file = getPath(...args);
		if(fs.existsSync(file)) {
			try {
				fs.rmSync(file, { recursive: true, force: true });
				//log(`Удалено: ${file}`, true);
			}catch(e){}
		}
	};
// Извлечение архива nwjs, ffmpeg
async function extractArhive(zipPath, outputDir, prefix = false) {
	const resolvedOutput = path.resolve(outputDir);
	prefix = toBoolean(prefix);
	return new Promise((resolve, reject) => {
		fs.createReadStream(zipPath)
			.pipe(unzipper.Parse())
			.on('entry', (entry) => {
				const fileName = entry.path;
				// 1. Сначала проверяем, что fileName существует и это строка
				if (typeof fileName !== 'string' || fileName.length === 0) {
					entry.autodrain();
					return;
				}
				// 2. Проверяем, что это директория
				if (fileName.slice(-1) === '/') {
					entry.autodrain();
					return;
				}
				const parts = fileName.split('/');
				if (parts.length === 0) {
					entry.autodrain();
					return;
				}
				const relativePath = prefix ? parts.slice(1).join('/') : parts.join('/');
				if (!relativePath) {
					entry.autodrain();
					return;
				}
				const destPath = path.join(resolvedOutput, relativePath);
				const resolvedDest = path.resolve(destPath);
				if (!resolvedDest.startsWith(resolvedOutput)) {
					console.warn('Blocked unsafe path:', fileName);
					entry.autodrain();
					return;
				}
				const dir = path.dirname(destPath);
				if (!fs.existsSync(dir)) {
					fs.mkdirSync(dir, { recursive: true });
				}
				entry.pipe(fs.createWriteStream(destPath));
			})
			.on('close', resolve)
			.on('error', reject);
	});
}
// Существование файла
async function fileExists(filePath) {
	let exists = true;
	try {
		await fs.promises.stat(filePath);
	} catch {
		exists = false;
	}
	return exists;
}
// Удаление файла
async function removeFile(file) {
	let exists = true;
	const fl = await fileExists(file);
	if(fl){
		try {
			fs.unlinkSync(file);
		} catch {
			exists = false;
		}
	}
	return exists;
}
// Создание директории
async function createDirectory(dir) {
	let exists = true;
	const fl = await fileExists(dir);
	if(!fl) {
		try {
			fs.mkdirSync(dir, {recursive: true});
		} catch {
			exists = false;
		}
	}
	return exists;
}
function DownloaderFn(url, out) {
	return new Promise(async function(resolve, reject){
		const { DownloaderHelper } = require('node-downloader-helper');
		const progress = new cliProgress.SingleBar({
			stopOnComplete: true,
			hideCursor: false,
			autopadding: true,
			barsize: 50
		},{
			format: formatBar,
			barCompleteChar: '\u2588',
			barIncompleteChar: '\u2592'
		});
		log(`${rightpad(`Download ${out}`, 18, ' ')} -> ${url}`);
		progress.start(100, 0);
		const dl = new DownloaderHelper(url, ".cache/", {
			fileName: out
		});
		dl.on('response', function(res){
			//console.log('response');
		});
		dl.on('end', function() {
			progress.stop();
			resolve();
		});
		dl.on('error', function(err){
			progress.stop();
			throw new Error('Download Failed');
			reject(err);
		});
		dl.on('progress', function(data){
			progress.update(parseInt(data.progress));
		});
		dl.start().catch(function(err) {
			progress.stop();
			reject(err);
		});
	});
}
// Получение манифеста
function getManifest(){
	return new Promise(async function(resolve, reject){
		const cah = await removeFile(".cache/manifest.json");
		if(cah){
			DownloaderFn('https://nwjs.io/versions.json', 'manifest.json').then(() => {
				const file = fs.readFileSync(".cache/manifest.json").toString();
				const obj = JSON.parse(file);
				options.version = options.version ? `v${options.version}` : obj.stable;
				options.tempvers = options.version.slice(1);
				options.uniqid = uniqid();
				resolve(options);
			}).catch((err) => reject(err));
		}else{
			reject();
		}
	});
}
// Получение nwjs
function getFlavor() {
	return new Promise(async function(resolve, reject){
		const cah = await fileExists(".cache/manifest.json");
		if(cah){
			const flv = options.sdk ? '-sdk' : '',
				dir = options.sdk ? 'sdk' : 'normal';
			try {
				const url = `https://dl.nwjs.io/${options.version}/nwjs${flv}-${options.version}-win-ia32.zip`,
					output = `${dir}.zip`,
					nwfile = await removeFile(`.cache/${output}`);
				if (nwfile) {
					DownloaderFn(url, output).then(() => resolve()).catch((err) => reject(err));
				}else{
					reject();
				}
			}catch(e){
				reject(e);
			}
		} else {
			reject();
		}
	});
}
// Получение ffmpeg
function getFFMPEG() {
	return new Promise(async function(resolve, reject){
		const url = `https://github.com/nwjs-ffmpeg-prebuilt/nwjs-ffmpeg-prebuilt/releases/download/${options.tempvers}/${options.tempvers}-win-ia32.zip`;
		const out = `ffmpeg.zip`;
		const ffmpegfile = await removeFile(`.cache/${out}`);
		if(ffmpegfile){
			DownloaderFn(url, out).then(() => resolve()).catch((err) => reject(err));
		}else{
			reject();
		}
	});
}
// Стартуем
const start = async (obj) => {
	return new Promise(async function(resolve, reject) {
		options = {
			record: toBoolean(obj.RECORD) ? true : false,
			sdk: toBoolean(obj.NWJS_TARGET) ? true : false,
			tempvers: obj.NWJS_VERSION ? (obj.NWJS_VERSION !== '0' ? obj.NWJS_VERSION : false) : false,
			update: toBoolean(obj.NWJS_UPDATE) ? true : false,
			version: obj.NWJS_VERSION ? (obj.NWJS_VERSION !== '0' ? obj.NWJS_VERSION : false) : false,
			maxLength: Boolean(Math.max(obj.MAX_LENGTH)) ? Math.max(obj.MAX_LENGTH) : 9,
		};
		const manifest = getPath('.cache', `manifest.json`);
		if (!options.update) {
			// Прочитать manifest.json
			// Собрать options
			if(fs.existsSync(manifest)) {
				try {
					const fileObj = JSON.parse(fs.readFileSync(manifest).toString());
					options.version = options.version ? `v${options.version}` : fileObj.stable;
					options.tempvers = options.version.slice(1);
					resolve(options);
				}catch(e) {
					logError(`Ошибка чтения: ${manifest}`);
					reject();
				}
			} else {
				logError(`Файл не найден: ${manifest}`);
				reject();
			}
			return;
		}
		try {
			const dir = options.sdk ? 'sdk' : 'normal';
			const archive_nw = getPath('.cache', `${dir}.zip`);
			const archive_ffmpeg = getPath('.cache', `ffmpeg.zip`);
			const directory_nw = getPath('.cache', `${dir}`);
			// deleteDir('.cache/normal');
			// deleteDir('.cache/sdk');
			await removeFile(manifest);
			await removeFile('.cache/normal.zip');
			await removeFile('.cache/sdk.zip');
			await removeFile('.cache/ffmpeg.zip');
			await getManifest().then((obj) => {
				options = obj;
				logStation({
					'Удачно': 'manifest.json',
				});
				deleteDir(getPath(directory_nw, options.tempvers));
			}).catch(err => {
				const txt = JSON.stringify(err, null, 4);
				logError(`Ошибка сборки: ${txt}`);
				reject(err);
				throw err;
			});
			await getFlavor().then(() => {
				logStation({
					'Удачно': `${dir}.zip`,
				});
			}).catch(err => {
				const txt = JSON.stringify(err, null, 4);
				logError(`Ошибка сборки: ${txt}`);
				reject(err);
				throw err;
			});
			await getFFMPEG().then(() => {
				logStation({
					'Удачно': `ffmpeg.zip`,
				});
			}).catch(err => {
				const txt = JSON.stringify(err, null, 4);
				logError(`Ошибка сборки: ${txt}`);
				reject(err);
				throw err;
			});
			if (!fs.existsSync(directory_nw)) {
				fs.mkdirSync(getPath(directory_nw, options.tempvers), { recursive: true });
			}
			await extractArhive(archive_nw, getPath(directory_nw, options.tempvers), true).then(() => {
				logStation({
					'Извлёк': `${archive_nw} -> ${getPath(directory_nw, options.tempvers)}`,
				});
			}).catch(err => {
				const txt = JSON.stringify(err, null, 4);
				logError(`Ошибка сборки: ${txt}`);
				reject(err);
				throw err;
			});
			await extractArhive(archive_ffmpeg, getPath(directory_nw, options.tempvers), false).then(() => {
				logStation({
					'Извлёк': `${archive_ffmpeg} -> ${getPath(directory_nw, options.tempvers)}`,
				});
			}).catch(err => {
				const txt = JSON.stringify(err, null, 4);
				logError(`Ошибка сборки: ${txt}`);
				reject(err);
				throw err;
			});
			resolve(options);
		} catch (err) {
			const txt = JSON.stringify(err, null, 4);
			logError(`Ошибка сборки: ${txt}`);
			reject(err);
			throw err;
		}
	});
};

module.exports = start;
// Версии NWJS
// https://nwjs.io/versions.json
