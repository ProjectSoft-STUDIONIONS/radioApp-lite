/**!
 * Module toast.js for "Your Radio"
 *
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
const { execFile } = require('node:child_process');
const path = require('node:path');

const toastNotify = (data) => {
		// Проверка: если нет объекта или нет хотя бы станции/трека — не делаем ничего
	if (!data || (!data.station && !data.track)) {
		console.warn('Toast skipped: station and/or track is missing');
		return;
	}

	//const exePath = path.join(path.dirname(process.execPath), 'toast.exe');
	const args = [];
	var params = [exePath];

	// Собираем аргументы только если поля есть — так не будет ошибок из‑за пустых значений
	if (data.station){
		args.push('-t', data.station);
		//params.push(`-t "${data.station}"`);
	}
	if (data.track){
		args.push('-d', data.track);
		//params.push(`-d "${data.track}"`);
	}
	if (data.iconPath){
		args.push('-i', data.iconPath);
		//params.push(`-i "${data.iconPath}"`);
	}
	if (data.imagePath){
		args.push('-p', data.imagePath);
		//params.push(`-p "${data.imagePath}"`);
	}
	if(data.appName) {
		args.push('-a', data.appName);
		//params.push(`-a "${data.appName}"`);
	}
	execFile(exePath, args, (error, stdout, stderr) => {
		if (error) {
			// Не ломаем приложение, просто логируем ошибку
			console.warn('Toast notification failed:', err.message);
			return;
		}
		console.log(`stdout: ${stdout}`);
		if (stderr) {
			console.error(`stderr: ${stderr}`);
		}
	});
}

module.exports = {
	toastNotify: toastNotify,
};

