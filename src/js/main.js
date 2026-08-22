/**!
 * YourRadio
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
// (nw.process.versions["nw-flavor"] == "sdk") &&  nw.Window.get().showDevTools();
// Закроем видимость констант и функций
!(() => {
	// Здесь только запуск
	// Константы
	const fs = require('fs');
	const path = require('path');
	const { app } = require('./modules/window.js')(nw.Window.get(), window, document);
	//const locale = require('./modules/locale.js');
	const DATA_DIR = path.normalize(path.join(nw.App.dataPath, 'radio'));
	const GLOB_SERVER = {
		HOST: 'localhost',
		PORT: 0,
		URL: ''
	};
	const win = nw.Window.get();
	// Проверим директории
	if(!fs.existsSync(path.normalize(path.join(nw.App.dataPath, 'radio', 'background')))){
		fs.mkdirSync(path.normalize(path.join(nw.App.dataPath, 'radio', 'background')), { recursive: true, force: true });
	}
	// Перезапишем иконку. Google Profile.ico
	fs.writeFileSync(path.normalize(path.join(nw.App.dataPath, 'Google Profile.ico')), fs.readFileSync(path.normalize(path.join(nw.__dirname, `favicon.ico`))));
	// Перезапишем иконку. favicon.ico
	if(!fs.existsSync(path.normalize(path.join(nw.App.dataPath, 'radio', 'favicon.ico')))) {
		fs.writeFileSync(path.normalize(path.join(nw.App.dataPath, 'radio', 'favicon.ico')), fs.readFileSync(path.normalize(path.join(nw.__dirname, `favicon.ico`))));
	}
	// Пауза на секунду и старт сервера
	setTimeout(() => {
		app.server.then(() => {
			// Сервер запущен
			GLOB_SERVER.HOST = app.GLOB_SERVER.HOST;
			GLOB_SERVER.PORT = app.GLOB_SERVER.PORT;
			GLOB_SERVER.URL = app.GLOB_SERVER.URL;
			// Вот здесь дальнейшее построение и запуск приложения
			if(!fs.existsSync(path.normalize(path.join(app.DATA_DIR, 'data.json')))) {
				// Файла нет. Читаем дефолт 
				app.defaultListStations();
			} else {
				// Файл есть. Читаем сохранёный
				app.readListStations();
			}
			document.querySelector("main").classList.remove('loading');
		}).catch((err) => {
			console.error(err);
			app.tray.remove();
			setTimeout(() => {
				// СЕрвер не запущен. Алерт и закрытие программы.
				window.alert(err);
				nw.Window.get().close(true);
			}, 200);
		});
	}, 0);
})();
