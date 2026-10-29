const { execFile } = require('child_process');
const path = require('path');

const toastNotify = (data) => {
		// Проверка: если нет объекта или нет хотя бы станции/трека — не делаем ничего
	if (!data || (!data.station && !data.track)) {
		console.warn('Toast skipped: station and/or track is missing');
		return;
	}

	const exePath = path.join(__dirname, 'toast.exe');
	const args = [];
	var params = [exePath];

	// Собираем аргументы только если поля есть — так не будет ошибок из‑за пустых значений
	if (data.station){
		args.push('-t', data.station);
		params.push(`-t ${data.station}`);
	}
	if (data.track){
		args.push('-d', data.track);
		params.push(`-d ${data.track}`);
	}
	if (data.iconPath){
		args.push('-i', data.iconPath);
		params.push(`-i ${data.iconPath}`);
	}
	if (data.imagePath){
		args.push('-p', data.imagePath);
		params.push(`-p ${data.imagePath}`);
	}
	console.log(params.join(" "));
	execFile(exePath, args, (err) => {
		if (err) {
			// Не ломаем приложение, просто логируем ошибку
			console.warn('Toast notification failed:', err.message);
		}
	});
}

module.exports = {
	toastNotify: toastNotify,
};
