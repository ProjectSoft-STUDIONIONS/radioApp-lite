const locale = require('./locale.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const mime = require('mime').default;
const icy = require('icy');
const notifier = require('node-notifier');
const EventDispatcher = require('./eventdispatcher.js');
const StationEl = require('./station.js');
const nwdialog = require('./nwdialog.js');
const DATA_DIR = path.normalize(path.join(nw.App.dataPath, 'radio'));
const SOURCE_FILE = path.normalize(path.join(nw.__dirname, 'radio', 'data.json'));
const { translit, tagTranslit } = require('./translit.js');
const butterchurn = require('butterchurn').default;

// Шаблон ошибки сервера
const errorTpl = (obj) => {
	return `<!DOCTYPE html>
<html lang="ru">
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
		<meta name="viewport" content="width=device-width,initial-scale=1"/>
		<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
		<meta name="SKYPE_TOOLBAR" content="SKYPE_TOOLBAR_PARSER_COMPATIBLE"/>
		<title>Ваше Радио</title>
		<meta name="color-scheme" content="light"/>
		<meta name="theme-color" content="#fff"/>
		<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"/>
	</head>
	<body style="font-family:Tahoma,sans-serif;margin:0;padding:10;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;">
		<h1>${obj.title}</h1>
		<p>${obj.text}</p>
	</body>
</html>`;
};

if(!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true, force: true });
}
var isMaximized = false,
	win_state = true,
	init_server = false,
	volume = 0,
	settime,
	player = false,
	isPlaying = false,
	isOnline = false,
	metainterval = 0,
	active = 0,
	stations = {},
	dataStations = {},
	genres = [],
	presetsSelectIndex = 0;
/**
 * Context Menu Constants 
 **/
const copyStationItem = new nw.MenuItem({
		label: locale.get("copyTitle"),
		type: 'normal',
		icon: 'images/copy.png'
	}),
	addStationItem = new nw.MenuItem({
		label: locale.get("insertTitle"),
		type: 'normal',
		icon: 'images/add.png'
	}),
	editStationItem = new nw.MenuItem({
		label: locale.get("editTitle"),
		type: 'normal',
		icon: 'images/edit.png'
	}),
	removeStationItem = new nw.MenuItem({
		label: locale.get("deleteTitle"),
		type: 'normal',
		icon: 'images/delete.png'
	}),
	separator = nw.MenuItem({
		type: 'separator'
	}),
	exportStations = new nw.MenuItem({
		label: locale.get("exportTitle"),
		type: 'normal',
		icon: 'images/export.png',
	}),
	importStations = new nw.MenuItem({
		label: locale.get("importTitle"),
		type: 'normal',
		icon: 'images/import.png',
	}),
	menu = new nw.Menu(),
	menuLi = new nw.Menu();
/**
 * Collecting the context menu
 **/
menu.append(addStationItem);
menu.append(separator);
menu.append(exportStations);
menu.append(importStations);
menuLi.append(addStationItem);
menuLi.append(separator);
menuLi.append(copyStationItem);
menuLi.append(editStationItem);
menuLi.append(separator);
menuLi.append(removeStationItem);
menuLi.append(separator);
menuLi.append(exportStations);
menuLi.append(importStations);
// буфер обмена
const clipboard = nw.Clipboard.get();



class App extends EventDispatcher {
	#server = null;
  	#ready = null;
 	audio = null;
 	audioCtx = null;
 	genreList = null;
	presets = {};
	presetsIndex = 0;
	presetsSelectIndex = -1;
	presetsNames = [];

	presetTime = 0;
 	radioList = null;
  	resolve = null;
 	reject = null;
	sourceNode = null;
 	tray = null;
	vizualizer = null;
	vizualizerCanvas = null;
	visualTime = 0;
 	// Конструктор
	constructor(win, window, document) {
		super();
		this.tray = null;
		this.audioCtx = null;
		this.sourceNode = null;
		this.win = win;
		this.window = window;
		this.document = document;
		init_server = false;
		this.title = locale.get('appName');
		this.GLOB_SERVER = {
			HOST: 'localhost',
			PORT: 0,
			URL: ''
		};
		this.#ready = new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
		// Плеер
		player = require('./audioplayer.js')(this.window, this.document);
		// Для визуализатора
		this.audio = player.audio;
		// Диалоги
		this.dialogSettings = this.document.querySelector('dialog.settings-block');
		this.dialogBox = this.document.querySelector('dialog.dialogBox');
		this.appBlock = this.document.querySelector('dialog.appBlock');
		// Листы
		this.radioList = this.document.querySelector("ul#radio-list");
		this.genreList = this.document.querySelector("ul#genre");
		// Визуализер блок
		this.vizualizerCanvas = this.document.querySelector(".vizualizer canvas");
		// Объединение объектов пресетов и сортировка по названиям 
		this.presets = Object.fromEntries(
			Object.entries(
				Object.assign(
					{},
					this.window.butterchurnPresets.getPresets(),
					this.window.butterchurnPresetsExtra.getPresets(),
					this.window.butterchurnPresetsExtra2.getPresets(),
				)
			).sort((a, b) =>  a[0].localeCompare(b[0]))
		);
		this.presetsNames = Object.keys(this.presets);
		this.presetsIndex = this.presetsNames.length ? 0 : false;
		this.presetsSelectIndex = -1;
		this.visualTime = 0;
		this.vizualizer = null;
		// Инициализируем документ
		this.initDocument();
		// Запускаем сервер
		this.startImageServer(4000);
		// События о play? pause, previoustrack и nexttrack
		this.window.navigator.mediaSession.setActionHandler('play', this.play.bind(this));
		this.window.navigator.mediaSession.setActionHandler('pause', this.stop.bind(this));
		this.window.navigator.mediaSession.setActionHandler('previoustrack', this.prev.bind(this));
		this.window.navigator.mediaSession.setActionHandler('nexttrack', this.next.bind(this));
		// online и offline
		isOnline = this.window.navigator.onLine;
		this.window.addEventListener('online',  this.updateOnlineStatus.bind(this));
		this.window.addEventListener('offline', this.updateOnlineStatus.bind(this));
		// Пресеты
		// Контехт диалога
		nwdialog.context = this.document;
	}
	// Запрет на перетаскивание
	disableDragDrop(e) {
		e.preventDefault();
		return !1;
	}
	// Слушаем online или offline
	updateOnlineStatus(e) {
		switch(e.type) {
			case "online":
				isOnline = true;
				if(isPlaying) {
					this.stop();
					this.play();
				} else {
					this.stop();
				}
				break;
			case "offline":
				isOnline = false;
				this.stop();
				break;
		}
	}
	// Простой лог
	log(...args) {
		this.console.dir(...args);
	}
	// Лог ошибок
	error(...args) {
		this.console.error(...args);
	}
	// console
	get console() {
		return this.window.console;
	}
	// Инициализация приложения
	initDocument() {
		const _self = this;
		this.win.icon = 'favicon.png';
		// Собираем иконкн трея
		this.tray = new nw.Tray({
			title: locale.get("appName"),
			tooltip: locale.get("appName"),
			icon: 'favicon.png'
		});
		const trayMenu = new nw.Menu(),
			tray_close = new nw.MenuItem({
				label: "" + locale.get("close"),
				icon: "images/tray_close.png",
				click: () => {
					this.win.close();
				}
			}),
			tray_mini_restore = new nw.MenuItem({
				label: "" + locale.get("minimize"),
				icon: "images/tray_minimize.png",
				click: () => {
					win_state ? (
						this.win.minimize(),
						tray_mini_restore.label = "" + locale.get("restore")
					) : (
						this.win.show(),
						this.win.setShowInTaskbar(false),
						tray_mini_restore.label = "" + locale.get("minimize")
					);
				}
			});
		this.tray.menu = trayMenu;
		trayMenu.append(tray_mini_restore);
		trayMenu.append(tray_close);
		this.tray.on('click', () => {
			win_state ? (
				this.win.minimize(),
				tray_mini_restore.label = "" + locale.get("restore")
			) : (
				this.win.show(),
				tray_mini_restore.label = "" + locale.get("minimize")
			);
		});
		// Сначала запускаем обработку кнопок в titlebar
		const miniBtn = this.document.querySelector('#minimized'),
			restoreBtn = this.document.querySelector('#restored'),
			closeBtn = this.document.querySelector('#close'),
			settingsBtn = this.document.querySelector('#settings'),
			fullscreenBtn = this.document.querySelector('#fullscreen'),
			maxRes = restoreBtn.querySelector('svg path'),
			fullRes = fullscreenBtn.querySelector('svg path'),
			restorePath = 'm 2,1e-5 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z',
			maximizePath = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z',
			fullscreenOn = "M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z",
			fullscreenOff = "M.2 15.8c.2.2.5.2.7 0L5 11.7v2.8c0 .3.2.5.5.5s.5-.2.5-.5v-4c0-.3-.2-.5-.5-.5h-4c-.3 0-.5.2-.5.5s.2.5.5.5h2.8L.2 15.1c-.2.2-.2.5 0 .7zm15.6 0c-.2.2-.5.2-.7 0L11 11.7v2.8c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-4c0-.3.2-.5.5-.5h4c.3 0 .5.2.5.5s-.2.5-.5.5h-2.8l4.1 4.1c.2.2.2.5 0 .7zm0-15.6c-.2-.2-.5-.2-.7 0L11 4.3V1.5c0-.3-.2-.5-.5-.5s-.5.2-.5.5v4c0 .3.2.5.5.5h4c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-2.8L15.8.9c.2-.2.2-.5 0-.7zM.2.2c.2-.2.5-.2.7 0L5 4.3V1.5c0-.3.2-.5.5-.5s.5.2.5.5v4c0 .3-.2.5-.5.5h-4c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h2.8L.2.9C0 .7 0 .4.2.2z";
		// Обработка клика по кнопкам minimized, restored, close, settings, fullscreen
		this.document.addEventListener('click', async (e) => {
			const eId = e.target.id;
			// ids
			if(
				[
					// Управление
					"minimized",
					"restored",
					"close",
					"settings",
					"fullscreen",
					// Настройки
					"noSettings",
					"okSettings"
				].includes(eId)
			) {
				e.preventDefault();
				
				var clear_stations = this.dialogSettings.querySelector("#clear_stations");
				var loadDefault = this.dialogSettings.querySelector("#loadDefault");
				var notify = this.dialogSettings.querySelector("#notify");
				var customBg = this.dialogSettings.querySelector("#custombg");
				var presetsRandom = this.dialogSettings.querySelector("#presetsRandom");
				var selectPreset = this.dialogSettings.querySelector("#selectPreset");
				// Выбор файла
				var inputFile = this.dialogSettings.querySelector("#background");
				switch(eId) {
					case "minimized":
					case "restored":
					case "close":
						eId == "minimized" ? this.win.minimize() : (eId == "close" ? this.win.close() : (isMaximized ? this.win.restore() : this.win.maximize()));
						break;
					case "settings":
						this.document.querySelector('main').classList.add('saving');
						var bg = this.dialogSettings.querySelector(".preview");
						var time = new Date().getTime();
						// Новый элемент
						var tempInput = this.document.createElement('input');
						tempInput.type = "file";
						tempInput.accept = "image/*";
						tempInput.id = "background";
						// selectPreset
						selectPreset.innerHTML = "";
						var optionNull = this.document.createElement('option');
						optionNull.value = "-1";
						optionNull.textContent = locale.get('selectPresetNo');
						selectPreset.append(optionNull);
						for(var index in this.presetsNames) {
							const option = this.document.createElement('option');
							option.value = index;
							option.textContent = this.presetsNames[index];
							selectPreset.append(option);
						}
						selectPreset.value = dataStations.presetindex;
						// Замена
						this.dialogSettings.querySelector("#background").parentNode.replaceChild(tempInput, this.dialogSettings.querySelector("#background"));
						// Выбор файла
						this.dialogSettings.showModal();
						clear_stations.checked = false;
						loadDefault.checked = false;
						notify.checked = Boolean(dataStations.notify);
						customBg.checked = Boolean(typeof dataStations.custombg == "string");
						// Если есть файл - загружаем.
						if(dataStations.custombg && fs.existsSync(path.join(this.DATA_DIR, 'background', `${dataStations.custombg}`))) {
							// Загружаем
							bg.setAttribute("style", `--background-config: url(${this.GLOB_SERVER.URL}/background/${dataStations.custombg})`)
						} else {
							// Иначе customBg.checked = false; dataStations.custombg = false;
							bg.removeAttribute("style");
							customBg.checked = false;
							dataStations.custombg = 0;
						}
						// Генерируем событие
						customBg.dispatchEvent(new Event("input"));
						// Загрузка пресетов в рандомно или по порядку
						presetsRandom.checked = dataStations.presetsRandom ? true : false;
						dataStations.presetsRandom = presetsRandom.checked;
						// Генерируем событие
						presetsRandom.dispatchEvent(new Event("input"));
						break;
					case "fullscreen":
						//this.win.toggleFullscreen();
						// Добавить блок, установить canvas, подключить breadcrumb
						clearTimeout(timeMouse);
						if(this.document.fullscreenElement){
							this.offVizualizer();
							this.document.exitFullscreen();
							this.document.body.classList.contains('fullscreen') && this.document.body.classList.remove('fullscreen');
							// Отключение визуализатора
						} else {
							!this.document.body.classList.contains('fullscreen') && this.document.body.classList.add('fullscreen');
							this.document.querySelector(".vizualizer").requestFullscreen();
							// Подключение визуализатора
							this.onVizualizer();
						}
						break;
					case "noSettings":
						this.dialogSettings.close();
						this.document.querySelector('main').classList.remove('saving');
						break;
					case "okSettings":
						this.document.body.removeAttribute("style");
						this.document.querySelector('main').classList.remove('saving');
						dataStations.notify = notify.checked;
						dataStations.presetsRandom = presetsRandom.checked;
						this.presetsSelectIndex = Number(selectPreset.value);
						dataStations.presetindex = this.presetsSelectIndex;
						if(clear_stations.checked) {
							this.clearStattions();
							// Эти две операции обязательны.
							this.saveStations();
							this.readListStations();
							if(loadDefault.checked){
								this.defaultListStations();
								this.saveStations();
							}
						}
						if(!clear_stations.checked && loadDefault.checked) {
							this.clearStattions();
							this.saveStations();
							this.defaultListStations();
							this.saveStations();
						};
						// Если есть выбор
						if(customBg.checked) {
							if(inputFile.files.length){
								// Если не png, Преобразуем в png
								var canvas = this.document.createElement('canvas');
								var ctx = canvas.getContext('2d');
								var file = inputFile.files[0];
								// Если не изображение
								if (!file.type.startsWith('image/')) {
									// Ничего не делаем и возвращаемся
									this.window.alert("Файл не поддерживается");
									return !1;
								}
								file = inputFile.files[0].path.replace(/\\/g, "/");
								time = new Date().getTime();
								const img = new Image();
								img.onload = (ev) => {
									// Копируем
									// Получить расширение
									const ext = path.extname(file);
									dataStations.custombg = `${time + ext}`;
									fs.copyFileSync(file, path.normalize(path.join(this.DATA_DIR, 'background', `${dataStations.custombg}`)));
									this.setStyleBackground();
									this.dialogSettings.close();

								};
								img.onerror = (ev) => {
									// Ничего не делаем
									dataStations.custombg = 0;
									this.setStyleBackground();
									this.dialogSettings.close();
									return;
								};
								img.src = file;
							} else {
								// Если нет файлов, то проверяем файл по конфигу
								if(!fs.existsSync(path.join(this.DATA_DIR, 'background', `${dataStations.custombg}`))){
									// Файла нет
									this.document.body.removeAttribute("style");
									dataStations.custombg = 0;
									this.setStyleBackground();
									this.dialogSettings.close();
								} else {
									// Файл есть. Обновим запись
									this.setStyleBackground();
									this.dialogSettings.close();
								}
							}
						} else {
							dataStations.custombg = 0;
							this.setStyleBackground();
							this.dialogSettings.close();
						}
						break;
				}
				return !1;
			}
			// Открываем ссылки в браузере
			if(e.target.tagName.toLowerCase() === 'a' && e.target.getAttribute('target') == "_blank") {
				e.preventDefault();
				nw.Shell.openExternal(e.target.href);
				return !1;
			}
		});
		// Клик на жанрах
		this.genreList.addEventListener('click', (e) => {
			e.preventDefault();
			const li = e.target;
			const filter = li.dataset.filter;
			[...this.genreList.querySelectorAll('li')].forEach((el) => {
				el.classList.remove('active');
			});
			li.classList.add('active');
			[...this.radioList.querySelectorAll('li')].forEach((el) => {
				el.classList.remove('hidden');
				if(filter !== 'all') {
					!el.classList.contains(filter) && el.classList.add('hidden');
				}
			})
			this.scrollActive();
			return !1;
		});
		// Установить действие на input["file"], input["chekbox"] фона, input["range"] громкость, кроп
		// Чекбокс
		this.document.addEventListener('input', (e) => {
			e.preventDefault();
			const el = e.target;
			var vol;
			// Чекбокс #custombg
			if(el.id == "custombg") {
				var prevDiv = this.document.querySelector(".customBg");
				if(el.checked) {
					prevDiv.classList.remove('hidden-block');
				} else {
					prevDiv.classList.add("hidden-block");
				}
			}
			// Выбор файла #background
			if(el.id == "background") {
				if(el.files.length) {
					var fl = el.files[0].path.replace(/\\/g, "/");
					this.document.querySelector(".preview").setAttribute('style', `--background-config: url(${fl})`);
				}else{
					this.document.querySelector(".preview").removeAttribute('style');
				}
			}
			// Громкость
			if(el.type == "range") {
				vol = Math.min(el.max, Math.max(el.min, parseFloat(el.value)));
				switch(el.id) {
					case "volume":
						el.setAttribute('style', `--background-range: ${vol}%;`);
						player.volume = vol / 100;
						// set update text
						var txt;
						if(txt = this.document.querySelector(`.left span.writ`)) {
							txt.textContent = `${parseInt(vol)}%`;
							txt.classList.add('visible');
							clearTimeout(settime);
							settime = setTimeout(() => {
								txt.classList.remove('visible')
							}, 2000);
						}
						break;
					// дальше по реализации
				}
			}
			return !1;
		});
		// Колёсико над Громкостью. Croppier?
		this.document.addEventListener('mousewheel', (e) => {
			const el = e.target;
			if(el.type == "range") {
				var o = e.wheelDelta,
					min = parseFloat(el.min),
					max = parseFloat(el.max),
					val = parseFloat(el.value),
					step = parseFloat(el.step);
				el.value = Math.min(max, Math.max(min, (val + (o > 0 ? step : -step))));
				switch(el.id) {
					case "input":
						this.volume = el.value;
						break;
					default:
						el.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
						break;
				}
			}
		});
		// Старт, Стоп станции
		this.document.addEventListener('radio:click', (e) => {
			const li = e.target;
			if(!isOnline) {
				li.classList.remove('play');
				li.classList.remove('preload');
				li.classList.add("stop");
				return;
			}
			[...this.radioList.querySelectorAll('li')].forEach((el) => {
				if(el.dataset.id !== li.dataset.id) {
					el.classList.remove('active');
					el.classList.remove('play');
					el.classList.remove('preload');
					el.classList.add("stop");
				} else {
					el.classList.add('active');
				}
			});
			dataStations.active = li.dataset.id;
			if(li.classList.contains('play')) {
				// Воспроизведение
				isPlaying = true;
				this.play();
			} else if(li.classList.contains('stop')) {
				// Остановлен
				isPlaying = false;
				this.stop();
			}
		});
		// События состояния плеера
		player.addEventListener('statechange', (e) => {
			const list = this.radioList;
			const el = list.querySelector("li.active");
			if(el) {
				switch(e.audioev) {
					case "play":
					case "playing":
						el.classList.remove("stop");
						el.classList.add('play');
						el.classList[e.bufering ? "add" : "remove"]('preload');
						break;
					case "stop":
						el.classList.remove('preload');
						el.classList.remove('play');
						el.classList.add("stop");
						break;
				}
			}
		});
		// Локализацмя
		this.updateLocale();
		// События win
		/**
		 * Позиция окна при запуске
		 */
		nw.Screen.Init();
		var w = nw.App.manifest.window.width,
			h = nw.App.manifest.window.height,
			screen = nw.Screen.screens[0],
			x = parseInt(screen.bounds.x + (screen.bounds.width - w) / 2) || 0,
			y = parseInt(screen.bounds.y + (screen.bounds.height - h) / 2) || 0,
			wid = screen.work_area.width,
			hei = screen.work_area.height;
		h = h > hei ? hei : h;
		w = w > wid ? wid : w;
		this.win.setMinimumSize(w, h);
		this.win.on('maximize', (e) => {
			isMaximized = !0;
			maxRes.setAttribute("d", restorePath);
			restoreBtn.setAttribute("title", locale.get("restore"));
			tray_mini_restore.label = "" + locale.get("minimize");
			tray_mini_restore.icon = "images/tray_minimize.png";
			this.win.setShowInTaskbar(true);
			win_state = !0;
			this.scrollActive();
		}).on('restore', (e) => {
			isMaximized = !1;
			restoreBtn.setAttribute("title", locale.get("default"));
			maxRes.setAttribute("d", maximizePath);
			tray_mini_restore.label = "" + locale.get("minimize");
			tray_mini_restore.icon = "images/tray_minimize.png";
			fullscreenBtn.setAttribute("title", locale.get("fullscreenOn"));
			fullRes.setAttribute("d", fullscreenOn);
			this.win.setShowInTaskbar(true);
			win_state = !0;
			this.scrollActive();
		}).on('minimize', () => {
			tray_mini_restore.label = "" + locale.get("restore");
			tray_mini_restore.icon = "images/tray_" + (isMaximized ? "maximize.png" : "normal.png");
			restoreBtn.setAttribute("title", (isMaximized ? locale.get("restore") : locale.get("default")));
			this.win.setShowInTaskbar(false);
			win_state = !1;
		}).on('enter-fullscreen', () => {
			fullscreenBtn.setAttribute("title", locale.get("fullscreenOff"));
			fullRes.setAttribute("d", fullscreenOff);
			this.scrollActive();
		}).on('close', () => {
			try {
				dataStations.notify && chrome.notifications.clear(String(nw.App.manifest.name));
				var main = this.document.querySelector('main');
				main.classList.remove('saving');
				main.classList.remove('loading');
				this.document.body.classList.add('closing');
				this.dialogSettings.open && this.dialogSettings.close();
				this.dialogBox.open && this.dialogBox.close();
				this.document.querySelector('main').classList.add('saving');
				try { this.tray.remove(); this.stop(); } catch (e) {}
				this.saveStations();
				// Просто специально ставим паузу для красивого закрытия
				setTimeout(() => this.win.close(true), 1100);
			} catch(e) {
				this.console.log(e)
			}
		});
		// Вырубаем перетаскивание на окно. Перенесено сюда.
		'dragover dragenter dragleave dragend'.split(' ').forEach((ev) => {
			this.window.addEventListener(ev, this.disableDragDrop);
		});
		this.document.body.addEventListener("dragstart", this.disableDragDrop);
		this.document.body.addEventListener("drop", this.disableDragDrop);
		// Перенесён сюда Sortable
		new this.window.Sortable(this.radioList, {
			animation: 50,
			direction: 'vertical',
			handle: ".radio-item-handler",
			scroll: false,
			onChoose: () => {
				'dragover dragenter dragleave dragend'.split(' ').forEach((ev) => {
					this.window.removeEventListener(ev, this.disableDragDrop);
				});
				this.document.body.removeEventListener("dragstart", this.disableDragDrop);
				this.document.body.removeEventListener("drop", this.disableDragDrop);
			},
			onStart: () => {
				'dragover dragenter dragleave dragend'.split(' ').forEach((ev) => {
					this.window.removeEventListener(ev, this.disableDragDrop);
				});
				this.document.body.removeEventListener("dragstart", this.disableDragDrop);
				this.document.body.removeEventListener("drop", this.disableDragDrop);
			},
			// сохранение
			onEnd: () => {
				this.saveStations();
				'dragover dragenter dragleave dragend'.split(' ').forEach((ev) => {
					this.window.addEventListener(ev, this.disableDragDrop);
				});
				this.document.body.addEventListener("dragstart", this.disableDragDrop);
				this.document.body.addEventListener("drop", this.disableDragDrop);
			}
		});
		// Визуализация начинается здесь
		// Контекстное меню
		this.document.addEventListener('contextmenu', (e) => {
			// Если не находимся в fullscreen
			if(!this.document.fullscreenElement){
				addStationItem.click = () => {this.addStation();addStationItem.click = null};
				exportStations.click = () => {this.exportStations();exportStations.click = null};
				importStations.click = () => {this.importStations();importStations.click = null};
				if(e.target.classList.contains('radio-item') || e.target.closest('li.radio-item')) {
					e.preventDefault();
					const li = e.target.classList.contains('radio-item') ? e.target : e.target.closest('li.radio-item');
					// Формируем меню
					const {id, name, genre, stream, title} = li.dataset;
					copyStationItem.label = locale.get("copyTitle", [name]);
					editStationItem.label = locale.get("editTitle", [name]);
					removeStationItem.label = locale.get("deleteTitle", [name]);
					// Событие для пункта Копирование
					copyStationItem.click = () => {
						copyStationItem.click = null;
						// Копируем
						clipboard.set(stream, 'text');
						// Диалог
						this.dialogBox.setAttribute("type", "alert");
						const wrap = this.dialogBox.querySelector(".wrap");
						const ok = this.dialogBox.querySelector("#ok");
						const no = this.dialogBox.querySelector("#cancel");
						wrap.innerHTML = `${locale.get("copyOk", [name])}<br><br>${stream}`;
						ok.onclick = (e) => {
							ok.onclick = null;
							this.dialogBox.open && this.dialogBox.close();
						};
						//ok.addEventListener('click', this.noStation.bind(this, []));
						this.dialogBox.showModal();
					};
					// Событие для пункта Удаление
					removeStationItem.click = () => {
						// Диалог
						removeStationItem.click = null;
						this.dialogBox.setAttribute("type", "confirm");
						const wrap = this.dialogBox.querySelector(".wrap");
						const ok = this.dialogBox.querySelector("#ok");
						const no = this.dialogBox.querySelector("#cancel");
						ok.onclick = (e) => {
							ok.onclick = null;
							this.removeStation({
								id: id,
								name: name,
								genre: genre,
								stream: stream,
								title: title
							});
						};
						no.onclick = (e) => {
							no.onclick = null;
							this.dialogBox.open && this.dialogBox.close();
						};
						wrap.innerHTML = `${locale.get("deleteStation", [name])}`
						this.dialogBox.showModal();
					};
					// Событие для пункта Редактирование
					editStationItem.click = () => {
						editStationItem.click = null;
						this.editStation({
							favicon: this.GLOB_SERVER.URL + `/${id}.png?${new Date().getTime()}`,
							genre: genre,
							genres: dataStations.genre,
							id: id,
							image: this.GLOB_SERVER.URL + `/${id}_big.png?${new Date().getTime()}`,
							name: name,
							stream: stream,
							title: title
						});
					};
					menuLi.popup(parseInt(e.screenX), parseInt(e.screenY));
					return !1;
				} else {
					if(e.target.classList.contains('notcontext') || e.target.closest('.notcontext')) {
						e.preventDefault();
						menu.popup(parseInt(e.screenX), parseInt(e.screenY));
						return !1;
					}
				}
			}
		});
		// Nouse show/hide fullscreen
		let timeMouse;
		// Регистрируем горячие клавиши на fullscreen
		// Escape fullscreen
		nw.App.registerGlobalHotKey(new nw.Shortcut({
			key : "Escape",
			active : () => {
				clearTimeout(timeMouse);
				if(this.document.fullscreenElement){
					this.offVizualizer();
					this.document.exitFullscreen();
					this.document.body.classList.contains('fullscreen') && this.document.body.classList.remove('fullscreen');
				}
			}
		}));
		nw.App.registerGlobalHotKey(new nw.Shortcut({
			key: "F11",
			active: () => {
				clearTimeout(timeMouse);
				if(this.document.fullscreenElement){
					this.offVizualizer();
					this.document.exitFullscreen();
					this.document.body.classList.contains('fullscreen') && this.document.body.classList.remove('fullscreen');
				} else {
					!this.document.body.classList.contains('fullscreen') && this.document.body.classList.add('fullscreen');
					this.document.querySelector("canvas").requestFullscreen();
					this.onVizualizer();
				}
			}
		}));
		// Слушаем Ресайз
		this.window.addEventListener("resize", (e) => {
			this.document.fullscreenElement ? (!this.document.body.classList.contains('fullscreen') && this.document.body.classList.add("fullscreen")) : (this.document.body.classList.contains('fullscreen') && this.document.body.classList.remove("fullscreen"));
			if(this.document.fullscreenElement){
				this.vizualizerCanvas.width  = this.window.screen.width;
				this.vizualizerCanvas.height = this.window.screen.height;
				this.vizualizer && this.vizualizer.setRendererSize(this.window.screen.width, this.window.screen.height);
			}
		});
		// Двойной клик на канвасе. Фулскрин. По сути только для выхода
		this.document.querySelector("main").addEventListener("dblclick", e => {
			e.preventDefault();
			if(this.document.fullscreenElement){
				clearTimeout(timeMouse);
				this.offVizualizer();
				this.document.exitFullscreen();
				this.document.body.classList.contains('fullscreen') && this.document.body.classList.remove('fullscreen');
				return !1;
			}
			return !1;
		});
		// Движение мыши для fullscreen
		this.document.body.addEventListener('mousemove', e => {
			if(this.document.fullscreenElement){
				clearTimeout(timeMouse);
				!this.document.body.classList.contains('mouse') && this.document.body.classList.add('mouse');
				timeMouse = setTimeout(() => {
					this.document.body.classList.contains('mouse') && this.document.body.classList.remove('mouse');
				}, 3000);
			}else{
				this.document.body.classList.contains('mouse') && this.document.body.classList.remove('mouse');
			}
		});
	}
	// Инициализация AudioContext
	initAudioSystem() {
		return new Promise((resolve, reject) => {
			try {
				if (!this.audioCtx) {
					this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
					this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
					this.sourceNode.connect(this.audioCtx.destination);
				}
				if (!this.vizualizer) {
					this.vizualizer = butterchurn.createVisualizer(
						this.audioCtx,
						this.vizualizerCanvas,
						{
							width: this.window.screen.width,
							height: this.window.screen.height
						}
					);
				}
				resolve();
			} catch(e) {
				reject(e);
			}
		});
	}
	getPreset() {
		clearTimeout(this.presetTime);
		if(dataStations.presetindex > -1) {
			this.presetsIndex = this.presetsSelectIndex;
		} else {
			if(dataStations.presetsRandom) {
				// Рандомный пресет
				this.presetsIndex = Math.floor(Math.random() * this.presetsNames.length);
				dataStations.presetsRandom = true;
			} else {
				// По порядку пресет
				this.presetsIndex = (this.presetsIndex + 1) % this.presetsNames.length;
				dataStations.presetsRandom = false;
			}
			this.presetsNames.length && this.vizualizer.loadPreset(this.presets[this.presetsNames[this.presetsIndex]], 1.0);
		}
		this.presetTime = setTimeout(this.getPreset.bind(this), 10000);
	}
	// Подключение Визуализатора
	onVizualizer() {
		this.initAudioSystem().then(() => {
			this.vizualizer.connectAudio(this.sourceNode);
			// (Здесь позже можно делать viz.loadPreset(...) — логика)
			//this.presetsIndex = Math.floor(Math.random() * this.presetsNames.length);
			if(this.presetsSelectIndex >=0) {
				this.vizualizer.loadPreset(this.presets[this.presetsNames[this.presetsSelectIndex]], 0.0);
			} else {
				this.vizualizer.loadPreset(this.presets[this.presetsNames[this.presetsIndex]], 0.0);
			}
			this.visualTime = this.window.requestAnimationFrame(this.renderAnimated.bind(this));
			setTimeout(() => {
				// Получить тайтл, разбить по `|` Получить первый;
				const title = this.radioList.querySelector('li.active').dataset.title;
				this.vizualizer.launchSongTitleAnim(`${title}`);
			}, 1000);
			this.getPreset();
		}).catch(e => {
			this.console.error(e);
		});
	}
	// Отключение Визуализатора
	offVizualizer() {
		this.initAudioSystem().then(() => {
			if(this.visualTime) {
				this.window.cancelAnimationFrame(this.visualTime);
			}
			clearTimeout(this.presetTime);
			this.vizualizer.disconnectAudio(this.sourceNode);
		}).catch(e => {
			this.console.error(e);
		});
	}
	// Рендер canvas
	renderAnimated() {
		if(this.vizualizer != null) this.vizualizer.render();
		this.visualTime = this.window.requestAnimationFrame(this.renderAnimated.bind(this));
	}
	// Старт сервера
	startImageServer(attemptPort) {
		const obj = {
			title: "",
			text: ""
		};
		const server = http.createServer((req, res) => {
			if (req.method !== 'GET') {
				res.writeHead(404, { 'Content-Type': 'text/html; charset=utf8' });
				obj.title = locale.get("NotFound");
				obj.text = locale.get("NotFoundText");
				res.end(errorTpl(obj));
				return;
			}
			if(!req.url.startsWith('/')) {
				res.writeHead(403, { 'Content-Type': 'text/html; charset=utf8' });
				obj.title = locale.get("Forbidden");
				obj.text = locale.get("ForbiddenText");
				res.end(errorTpl(obj));
				return;
			}
			const queryStart = req.url.indexOf('?');
			const pathPart = queryStart === -1 ? req.url : req.url.substring(0, queryStart);
			const fileName = this.window.decodeURIComponent(pathPart.substring('/'.length));
			const filePath = path.join(DATA_DIR, fileName);
			const realDir = path.resolve(DATA_DIR);
			const realFile = path.resolve(filePath);
			// Если к контейнеру
			// Защита от выхода за пределы DATA_DIR
			if (String(fileName).trim() == "" || !realFile.startsWith(realDir)) {
				res.writeHead(403, { 'Content-Type': 'text/html; charset=utf8' });
				obj.title = locale.get("Forbidden");
				obj.text = locale.get("ForbiddenText");
				res.end(errorTpl(obj));
				return;
			}
			fs.readFile(filePath, (err, data) => {
				if (err) {
					res.writeHead(404, { 'Content-Type': 'text/html; charset=utf8' });
					obj.title = locale.get("NotFound");
					obj.text = locale.get("NotFoundText");
					res.end(errorTpl(obj));
					return;
				}
				// Определяем тип файла
				const ext = path.extname(fileName).toLowerCase();
				let mimeType = mime.getType(path.extname(fileName).toLowerCase());
				mimeType = mimeType ? mimeType : 'application/octet-stream';
				res.writeHead(200, {
					'Content-Type': mimeType,
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					'Pragma': 'no-cache',
					'Expires': '0',
				});
				res.end(data);
			});
		});
		server.listen(attemptPort, () => {
			const port = server.address().port;
			this.GLOB_SERVER.PORT = port;
			this.GLOB_SERVER.URL = `http://${this.GLOB_SERVER.HOST}:${this.GLOB_SERVER.PORT}`;
			//this.initDocument();
			this.resolve();
		});
		server.on('error', (err) => {
			if (err.code === 'EADDRINUSE') {
				// Рекурсивно пробуем следующий порт
				if(attemptPort < 4101){
					this.startImageServer(attemptPort + 1);
					return;
				}
				//this.initDocument();
				this.reject(locale.get("ErrorServerPort", [String(attemptPort)]));
				return;
			}
			//this.initDocument();
			this.reject('Server error: ' + JSON.stringify(err.code, null, "\t"));
		});
	};
	// Локаль приложения
	updateLocale() {
		// Тексты
		[...this.document.querySelectorAll("[data-i18n]")].forEach((el) => {
			const key = el.dataset.i18n;
			el.textContent = locale.get(key);
		});
		// Тайтлы
		[...this.document.querySelectorAll("[data-i18n-title]")].forEach((el) => {
			const key = el.dataset.i18nTitle;
			el.setAttribute("title", locale.get(key));
		});
	}
	// Установка фона
	setStyleBackground() {
		this.document.querySelector("#background").value = "";
		if(typeof dataStations.custombg == "string") {
			if(fs.existsSync(path.join(this.DATA_DIR, 'background', `${dataStations.custombg}`))) {
				this.document.body.setAttribute('style', `--background-config: url(${this.GLOB_SERVER.URL}/background/${dataStations.custombg})`);
			this.document.querySelector(".preview").setAttribute('style', `--background-config: url(${this.GLOB_SERVER.URL}/background/${dataStations.custombg})`);
				// Удалить кроме этой в директории
				[...fs.readdirSync(path.join(this.DATA_DIR, 'background'), { withFileTypes: true })]
					// Получить только файлы
					.filter(f => {
						if(f.isFile()) {
							return f.name !== `${dataStations.custombg}`;
						}
						return false;
					})
					// Сформировать полный путь
					.map(f => path.join(path.join(this.DATA_DIR, 'background'), f.name))
					// Прбежаться и удалить
					.forEach(f => {
						try {
							fs.unlinkSync(f);
						} catch (e) {
							this.log(e);
						}
					});
			} else {
				dataStations.custombg = 0;
				this.document.body.removeAttribute('style');
				this.document.querySelector(".preview").removeAttribute('style');
				// Удалить всё в директории
				[...fs.readdirSync(path.join(this.DATA_DIR, 'background'), { withFileTypes: true })]
					// Получить только файлы
					.filter(f => f.isFile())
					// Сформировать полный путь
					.map(f => path.join(path.join(this.DATA_DIR, 'background'), f.name))
					// Прбежаться и удалить
					.forEach(f => {
						try {
							fs.unlinkSync(f);
						} catch (e) {
							this.log(e);
						}
					});
			}
		} else {
			// Удалить всё в директории
			[...fs.readdirSync(path.join(this.DATA_DIR, 'background'), { withFileTypes: true })]
				// Получить только файлы
				.filter(f => f.isFile())
				// Сформировать полный путь
				.map(f => path.join(path.join(this.DATA_DIR, 'background'), f.name))
				// Прбежаться и удалить
				.forEach(f => {
					try {
						fs.unlinkSync(f);
					} catch (e) {
						this.log(e);
					}
				});
			this.document.body.removeAttribute('style');
			this.document.querySelector(".preview").removeAttribute('style');
		}
	}
	blobToBuffer(blob) {
		return new Promise((resolve, reject) => {
			if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
				reject('first argument must be a Blob');
			}
			const reader = new FileReader();
			const onLoadEnd = (e) =>  {
				reader.removeEventListener('loadend', onLoadEnd, false);
				if (e.error) reject(e.error);
				else resolve(Buffer.from(reader.result));
			}
			reader.addEventListener('loadend', onLoadEnd, false);
			reader.readAsArrayBuffer(blob);
		});
	}
	// Чтение дефолтного листа станций
	defaultListStations() {
		this.stop();
		const genre = this.genreList;
		const list = this.radioList;
		const setters = new Set();
		// Если каталог не существует
		if(!fs.existsSync(DATA_DIR)) {
			fs.mkdirSync(DATA_DIR, { recursive: true, force: true });
		}
		// Очистка каталога
		[...fs.readdirSync(this.DATA_DIR, { withFileTypes: true })]
			// Получить только файлы
			.filter(f => f.isFile())
			// Сформировать полный путь
			.map(f => path.join(this.DATA_DIR, f.name))
			// Прбежаться и удалить
			.forEach(f => {
				try {
					fs.unlinkSync(f);
				} catch (e) {
					this.log(e);
				}
			});
		// Очищаем список радио
		while (list.firstChild) {
			list.removeChild(list.firstChild);
		}
		// Очищаем список станций
		while (genre.firstChild) {
			genre.removeChild(genre.firstChild);
		}
		// Временный объект для данных data.json
		const temp = {
			active: 0,
			genre: [],
			notify: true,
			presetindex: dataStations.presetindex,
			presetsRandom: dataStations.presetsRandom,
			stations: {},
			volume: player.volume,
			custombg: 0,
		};
		// Чтение дефолтного файла
		// Кастомный бакграунд
		var bg = 0;
		if(dataStations.custombg) {
			bg = dataStations.custombg;
		}
		dataStations = Object.assign({
			active: 0,
			genre: [],
			notify: true,
			presetindex: -1,
			presetsRandom: false,
			stations: {},
			volume: player.volume,
			custombg: bg,
		}, JSON.parse(fs.readFileSync(SOURCE_FILE).toString()));
		for (const key in dataStations.stations) {
			const station = dataStations.stations[key];
			const { favicon, genre, id, image, name, stream } = dataStations.stations[key];
			const favData = favicon.split(';base64,').pop();
			const imgData = image.split(';base64,').pop();
			for(const gn in genre) {
				if(String(genre[gn]).trim() !== ""){
					setters.add(String(genre[gn]).trim());
				}
			}
			temp.stations[key] = {
				genre: genre,
				id: id,
				name: name,
				stream: stream
			};
			try {
				fs.writeFileSync(path.join(this.DATA_DIR, `${id}.png`), favData, { encoding: 'base64' });
				fs.writeFileSync(path.join(this.DATA_DIR, `${id}_big.png`), imgData, { encoding: 'base64' });
				// Ставим станцию в лист
				const st= new StationEl({
					genre: genre,
					id: id,
					name: name,
					stream: stream,
				}, this.document, this.GLOB_SERVER.URL);
				list.append(st.li);
				if(dataStations.active == id) {
					st.li.classList.add('active');
				}
				st.li.classList.add('stop');
			}catch(e){
				this.log(e);
			}
		}
		//
		genres = [...setters].sort((a, b) => a.localeCompare(b));
		genre.innerHTML = `<li class="genre_item active" data-filter="all"><span>Все</span></li>`;
		for(const key in genres){
			const li = this.document.createElement('li');
			const span = this.document.createElement('span');
			const filter = `${tagTranslit(String(genres[key]).trim())}`;
			li.append(span);
			span.textContent = String(genres[key]).trim();
			genre.append(li);
			li.classList.add('genre_item');
			li.dataset.filter = filter;
		}
		// Устанавливаем громкость из файла 
		this.volume = temp.volume * 100;
		// Копируем дефолтную иконку и картинку
		// Сохраняем JSON
		temp.genre = genres;
		temp.active = dataStations.active;
		temp.notify = dataStations.notify;
		temp.genre = dataStations.genre.sort((a, b) => a.localeCompare(b));
		temp.volume = this.volume / 100;
		temp.custombg = dataStations.custombg = bg;
		stations = Object.assign({}, temp.stations);
		try {
			fs.writeFileSync(path.join(this.DATA_DIR, `data.json`), JSON.stringify(temp, null, "\t"));
		}catch(e){
			this.log(e);
		}
		this.scrollActive();
		this.setStyleBackground();
	}
	// Чтение сохранёного листа станций
	readListStations(scroll = true) {
		const genre = this.genreList;
		const list = this.radioList;
		const setters = new Set();
		this.stop();
		// Очищаем список радио
		while (list.firstChild) {
			list.removeChild(list.firstChild);
		}
		// Очищаем список станций
		while (genre.firstChild) {
			genre.removeChild(genre.firstChild);
		}
		const file = path.join(this.DATA_DIR, 'data.json');
		var dataFile = JSON.parse(fs.readFileSync(file).toString());
		dataStations = Object.assign({
			active: 0,
			genre: [],
			notify: true,
			presetindex: -1,
			presetsRandom: false,
			stations: {},
			volume: 1,
			custombg: 0,
		}, dataFile);
		for (const key in dataStations.stations) {
			const station = dataStations.stations[key];
			const { genre, id, name, stream } = dataStations.stations[key];
			try {
				// Ставим станцию в лист
				var st= new StationEl({
					genre: genre,
					id: id,
					name: name,
					stream: stream,
				}, this.document, this.GLOB_SERVER.URL);
				list.append(st.li);
				if(dataStations.active == id) {
					st.li.classList.add('active');
				}
				st.li.classList.add('stop');
				for(const gn in genre) {
					if(String(genre[gn]).trim() !== ""){
						setters.add(String(genre[gn]).trim());
					}
				}
			}catch(e){
				this.log(e);
			}
		}
		//
		genres = [...setters].sort((a, b) => a.localeCompare(b));
		genre.innerHTML = `<li class="genre_item active" data-filter="all"><span>Все</span></li>`;
		for(const key in genres){
			const li = this.document.createElement('li');
			const span = this.document.createElement('span');
			const filter = `${tagTranslit(String(genres[key]).trim())}`;
			li.append(span);
			span.textContent = String(genres[key]).trim();
			genre.append(li);
			li.classList.add('genre_item');
			li.dataset.filter = filter;
		}
		dataStations.genre = genres;
		this.volume = dataStations.volume * 100;
		stations = Object.assign({}, dataStations.stations);
		scroll && this.scrollActive();
		this.setStyleBackground();
	}
	// Показ диалога Редактирования/Добавления this.appBlock и сохранение
	showAppBlock(type = "insert", obj) {
		/**
		{
			favicon: this.GLOB_SERVER.URL + `/${id}.png?${new Date().getTime()}`,
			genre: genre,
			genres: dataStations.genre,
			id: id,
			image: this.GLOB_SERVER.URL + `/${id}_big.png?${new Date().getTime()}`,
			name: name,
			stream: stream,
			title: title
		}
		*/
		const data = Object.assign({type: type}, obj);
		// И вот далее рендер и функционал зависящий от data.type
		const title = data.type == "insert" ? locale.get("insertTitle") : locale.get("editTitle", [data.name]);
		this.appBlock.innerHTML = `<div class="modal clearfix">` +
			`<div class="modal-dialog">` +
				`<div class="modal-wrapper">` +
					`<div class="cropie_big"></div>` +
					`<h2 class="modal-title text-center">${title}</h2>` +
					`<div class="modal-inputs row">` +
						`<label class="modal-label container">` +
							`<input class="control name" type="text" value="" placeholder="${locale.get("insertName")}">` +
							`<span>${locale.get("insertName")}</span>` +
						`</label>` +
						`<label class="modal-label container">` +
							`<input class="control stream" type="text" value="" placeholder="${locale.get("inserStream")}">` +
							`<span>${locale.get("inserStream")}</span>` +
						`</label>` +
					`</div>` +
					`<div class="modal-crop">` +
						`<div class="cropie"></div>` +
						`<div class="modal-fileicon">` +
							`<div class="fileicon icon-add-photo" title="${locale.get("addIcon")}"></div>` +
						`</div>` +
					`</div>` +
					`<div class="modal-tags">` +
						`<tags-editor list="${data.genre.toString()}" genre="${data.genres.toString()}"></tags-editor>` +
					`</div>` +
					`<div class="modal-buttons">` +
						`<button class="control ok" type="button">${locale.get("ok")}</button>` +
						`<button class="control cancel" type="button">${locale.get("cancel")}</button>` +
					`</div>` +
				`</div>` +
			`</div>` +
		`</div>`;
		const okBtn = this.dialogBox.querySelector("#ok");
		const wrap = this.dialogBox.querySelector(".wrap");
		this.dialogBox.setAttribute("type", "alert");
		okBtn.onclick = (e) => {
			this.dialogBox.open && this.dialogBox.close();
		};
		const ok = this.appBlock.querySelector("button.ok");
		const cancel = this.appBlock.querySelector("button.cancel");
		const btn = this.appBlock.querySelector(".fileicon");
		const tagsEditor = this.appBlock.querySelector('tags-editor');
		const name = this.appBlock.querySelector("input.name");
		const stream = this.appBlock.querySelector("input.stream");
		tagsEditor.setAttribute("list", data.genre.toString());
		tagsEditor.setAttribute("genre", data.genres.toString());
		name.value = data.name;
		stream.value = data.stream;
		const bigCropie = new this.window.Croppie(this.appBlock.querySelector('.cropie_big'), {
			viewport: {
				width: 360,
				height: 180,
				type: 'square'
			},
			boundary: {
				width: 360,
				height: 180
			},
			showZoomer: false,
			mouseWheelZoom: false,
			enableExif: false,
			enableZoomenableZoom: false,
		});
		bigCropie.bind({
			url: data.type == "insert" ? `${this.GLOB_SERVER.URL}/image_big.png` : data.image
		});
		const favCropie = new this.window.Croppie(this.appBlock.querySelector('.cropie'), {
			viewport: {
				width: 180,
				height: 180,
				type: 'circle'
			},
			boundary: {
				width: 180,
				height: 180
			},
			showZoomer: true,
			enableOrientation: true,
			mouseWheelZoom: true,
			enableExif: true
		});
		favCropie.bind({
			url: data.type == "insert" ? `${this.GLOB_SERVER.URL}/image_big.png` : data.image
		});
		btn.onclick = (event) => {
			nwdialog.openFileDialog(['.jpeg', '.jpg', '.png'], (result) => {
				if(!result) {
					return;
				}
				result = "file:///" + result.split('\\').join('/');
				favCropie.bind({
					url: result
				});
				bigCropie.bind({
					url: result
				});
			});
		};
		ok.onclick = async (event) => {
			if(!String(name.value).trim()) {
				wrap.innerHTML = locale.get("editNameAlert");
				this.dialogBox.showModal();
				return;
			}
			if(!String(stream.value).trim()) {
				wrap.innerHTML = locale.get("editStreamAlert");
				this.dialogBox.showModal();
				return;
			}
			// Удалить исходные изображения.
			try {
				fs.existsSync(path.normalize(path.join(this.DATA_DIR, `${data.id}.png`))) && fs.unlinkSync(path.normalize(path.join(this.DATA_DIR, `${data.id}.png`)));
				fs.existsSync(path.normalize(path.join(this.DATA_DIR, `${data.id}_big.png`))) && fs.unlinkSync(path.normalize(path.join(this.DATA_DIR, `${data.id}_big.png`)));
			}catch(e){}
			// Получение новых изображений
			try {
				// заменить новыми,
				let baseFav = await favCropie.result({
					type: "base64",
					size: "viewport",
					format: "png",
					quality: 1,
					circle: true
				});
				let baseBig = await bigCropie.result({
					type: "base64",
					size: "viewport",
					format: "png",
					quality: 1,
					circle: false
				});
				// Получаем base64 изображений для записи
				baseFav = baseFav.split(';base64,').pop();
				baseBig = baseBig.split(';base64,').pop();
				// id изменить при сохранении
				data.id = data.type == "insert" ? new Date().getTime() : data.id;
				// Пишем в файлы
				fs.writeFileSync(path.normalize(path.join(this.DATA_DIR, `${data.id}.png`)), baseFav, { encoding: 'base64' });
				fs.writeFileSync(path.normalize(path.join(this.DATA_DIR, `${data.id}_big.png`)), baseBig, { encoding: 'base64' });
				// обновить станцию,
				// Используем именно let. Будет переопределение
				const element = data.type == "insert" ? this.document.createElement("li") : this.radioList.querySelector(`li[data-id="${data.id}"]`);
				name.value = String(name.value).trim();
				stream.value = String(stream.value).trim();
				element.setAttribute("data-id", data.id);
				element.setAttribute("data-name", name.value);
				element.setAttribute("data-title", name.value);
				element.setAttribute("data-stream", stream.value);
				element.setAttribute("data-genre", tagsEditor.getAttribute("list").trim());
				// Вставить в лист
				data.type == "insert" && this.radioList.append(element);
				// сохранить список.
				this.saveStations();
				// перезагрузить список
				this.readListStations(false);
				// Прокрутить до редактируемой
				setTimeout(() => {
					this.scrollToEl(this.radioList.querySelector(`li[data-id="${data.id}"]`));
				}, 10);
			} catch(err) {
				this.console.error(err);
				wrap.innerHTML = locale.get("errorSaveMessageAlert");
				this.dialogBox.showModal();
				return;
			}
			favCropie.destroy();
			bigCropie.destroy();
			ok.onclick = null;
			cancel.onclick = null;
			okBtn.onclick = null;
			this.appBlock.close();
			this.appBlock.innerHTML = "";
			return;
		};
		cancel.onclick = (event) => {
			ok.onclick = null;
			cancel.onclick = null;
			okBtn.onclick = null;
			this.appBlock.close();
			this.appBlock.innerHTML = "";
			return;
		};
		this.appBlock.showModal();
	}
	// Добавление станции
	addStation() {
		// Останавливаем воспроизведение
		this.stop();
		// insert
		this.showAppBlock("insert", {
			favicon: "",
			genre: [],
			genres: dataStations.genre,
			id: new Date().getTime(),
			image: "",
			name: "",
			stream: "",
			title: ""
		});
	}
	// Редактирование станции
	editStation(obj) {
		// Останавливаем воспроизведение
		this.stop();
		// edit
		this.showAppBlock("edit", obj);
	}
	// Удаление станции
	removeStation(obj) {
		// Получаем пункт станции
		var li = this.radioList.querySelector(`[data-id="${obj.id}"]`);
		if(li) {
			var isPlay = player.isPlaying();
			this.stop();
			li.remove();
			// Сохраняем станции
			this.saveStations();
			// Удалить файлы
			var icon = path.normalize(path.join(this.DATA_DIR, `${obj.id}.png`));
			var iconBig = path.normalize(path.join(this.DATA_DIR, `${obj.id}_big.png`));
			fs.existsSync(icon) && fs.unlinkSync(icon);
			fs.existsSync(iconBig) && fs.unlinkSync(iconBig);
			// Пауза и чтение
			setTimeout(() => {
				this.readListStations(false);
				isPlay && this.play();
			}, 10);
		}
		this.dialogBox.open && this.dialogBox.close();
	}
	// Экспорт станций и настроек
	exportStations() {
		try {
			var saveStations = {
				active: dataStations.active,
				custombg: false,
				genre: [],
				notify: dataStations.notify,
				presetindex: dataStations.presetindex,
				presetsRandom : dataStations.presetsRandom ? true : false,
				stations: {},
				volume: dataStations.volume,
			}
			// Собрать станции, жанры, кастомный фон
			// заберём кастомный фон
			if(dataStations.custombg) {
				var cbPath = path.normalize(path.join(this.DATA_DIR, 'background', dataStations.custombg));
				if(fs.existsSync(cbPath)) {
					const ext = path.extname(cbPath).toLowerCase();
					const mimeType = mime.getType(ext);
					if(mimeType){
						try {
							const cbBase = fs.readFileSync(cbPath, { encoding: 'base64' });
							saveStations.custombg = `data:${mimeType};base64,${cbBase}`;
						} catch(e){
							saveStations.custombg = false;
						}
					} else {
						saveStations.custombg = false;
					}
				}
			}
			// Собираем жанры
			const setters = new Set();
			// Пробегаем по станциям
			for(const key in dataStations.stations) {
				const favicon = fs.readFileSync( path.normalize(path.join(this.DATA_DIR, `${key}.png`)), { encoding: 'base64' });
				const image = fs.readFileSync( path.normalize(path.join(this.DATA_DIR, `${key}_big.png`)), { encoding: 'base64' });
				dataStations.stations[key].genre.forEach(f => {
					setters.add(f);
				});
				saveStations.stations[key] = {
					favicon: `data:image/png;base64,${favicon}`,
					genre: dataStations.stations[key].genre,
					id: key,
					image: `data:image/png;base64,${image}`,
					name: dataStations.stations[key].name,
					stream: dataStations.stations[key].stream
				}
			}
			saveStations.genre = [...setters].filter(f => f !== "").sort((a, b) => a.localeCompare(b));
			const json = JSON.stringify(saveStations);
			// Отдать json
			nwdialog.saveFileDialog('radio-export', '.json', function(sfile){
				// loading
				fs.writeFile(sfile, json, 'utf8', (err) => {
					//$("main").removeClass('loading');
					if(!err){
						// Успешно
					}else{
						// Ошибка записи в файл
						throw "Error write file json";
					}
				});
			});
		} catch(e) {
			const ok = this.dialogBox.querySelector("#ok");
			const wrap = this.dialogBox.querySelector(".wrap");
			this.dialogBox.setAttribute("type", "alert");
			wrap.innerHTML = locale.get("exportError");
			this.dialogBox.showModal();
			ok.onclick = (e) => {
				ok.onclick = null;
				this.dialogBox.open && this.dialogBox.close();
			};
		}
	}
	// Импорт станций и настроек
	importStations() {
		try {
			this.console.log("ИМПОРТ");
			nwdialog.openFileDialog(['.json'], false, (file) => {
				if(file !== false) {
					player.stop();
					this.console.log(file)
					this.document.querySelector('main').classList.add('saving');
					setTimeout(() => {
						const readFile = fs.readFileSync(file).toString();
						const json = JSON.parse(readFile);
						this.stop();
						const genre = this.genreList;
						const list = this.radioList;
						const setters = new Set();
						if(!fs.existsSync(path.join(DATA_DIR, 'background'))) {
							fs.mkdirSync(path.join(DATA_DIR, 'background'), { recursive: true, force: true });
						}
						[...fs.readdirSync(this.DATA_DIR, { withFileTypes: true })]
							.filter(f => f.isFile())
							.map(f => path.join(this.DATA_DIR, f.name))
							.forEach(f => {
								fs.unlinkSync(f);
							});
						[...fs.readdirSync(path.join(DATA_DIR, 'background'), { withFileTypes: true })]
							.filter(f => f.isFile())
							.map(f => path.join(this.DATA_DIR, 'background', f.name))
							.forEach(f => {
								fs.unlinkSync(f);
							});
						while (list.firstChild) {
							list.removeChild(list.firstChild);
						}
						while (genre.firstChild) {
							genre.removeChild(genre.firstChild);
						}
						const temp = {
							active: json.active,
							genre: [],
							notify: json.notify,
							presetindex: this.presetsSelectIndex,
							presetsRandom: json.presetsRandom ? true : false,
							stations: {},
							volume: json.volume,
							custombg: false,
						};
						if(json.custombg) {
							const mt = json.custombg.split(',')[0].split(':')[1].split(';')[0];
							this.console.log(mt);
							const ext = mime.getExtension(mt);
							this.console.log(ext);
							if(ext) {
								const time = new Date().getTime();
								const custombg = json.custombg.split(';base64,').pop();
								fs.writeFileSync(path.join(this.DATA_DIR, 'background', `${time}.${ext}`), custombg, { encoding: 'base64' });
								temp.custombg = `${time}.${ext}`;
							}
						}
						for (const key in json.stations) {
							const { favicon, genre, id, image, name, stream } = json.stations[key];
							temp.stations[key] = {
								genre: genre,
								id: id,
								name: name,
								stream: stream
							};
							for(const gn in genre) {
								if(String(genre[gn]).trim() !== ""){
									setters.add(String(genre[gn]).trim());
								}
							}
							const favData = favicon.split(';base64,').pop();
							const imgData = image.split(';base64,').pop();
							fs.writeFileSync(path.join(this.DATA_DIR, `${id}.png`), favData, { encoding: 'base64' });
							fs.writeFileSync(path.join(this.DATA_DIR, `${id}_big.png`), imgData, { encoding: 'base64' });
						}
						temp.genre = [...setters].sort((a, b) => a.localeCompare(b));
						fs.writeFileSync(path.join(this.DATA_DIR, `data.json`), JSON.stringify(temp, null, "\t"));
						this.readListStations();
						this.document.querySelector('main').classList.remove('saving');
					}, 1000);
				}
			});
		} catch(e) {
			const ok = this.dialogBox.querySelector("#ok");
			const wrap = this.dialogBox.querySelector(".wrap");
			this.dialogBox.setAttribute("type", "alert");
			wrap.innerHTML = locale.get("importError");
			this.dialogBox.showModal();
			ok.onclick = (e) => {
				ok.onclick = null;
				this.dialogBox.open && this.dialogBox.close();
				this.document.querySelector('main').classList.remove('saving');
			};
		}
	}
	// Сохранение станций
	saveStations() {
		const file = path.join(this.DATA_DIR, 'data.json');
		const genre = this.genreList;
		const list = this.radioList;
		const lis = [...list.querySelectorAll("li")];
		const setters = new Set();
		var active = 0;
		stations = {};
		for (const key in lis) {
			const { id, name, stream, genre } = lis[key].dataset;
			const tempGenre = genre.split(',').map(f => String(f).trim());
			stations[id] = {
				genre: tempGenre,
				id: id,
				name: name,
				stream: stream,
			}
			// Собрать жанры
			for(const gn in tempGenre) {
				if(String(tempGenre[gn]).trim() !== ""){
					setters.add(String(tempGenre[gn]).trim());
				}
			}
			if(lis[key].classList.contains('active')) {
				active = id;
			}
		}
		dataStations.active = active;
		dataStations.genre = [...setters].sort((a, b) => a.localeCompare(b));
		dataStations.presetindex = this.presetsSelectIndex;
		dataStations.presetsRandom = dataStations.presetsRandom ? true : false;
		dataStations.stations = stations;
		dataStations.volume = player.volume;
		try{
			fs.writeFileSync(file, JSON.stringify(dataStations, null, "\t"));
			// Проверка на существование дополнительных файлов. Если нет - копируем
			[
				`image_fav.png`,
				`image_big.png`,
				`favicon.ico`
			].forEach(f => {
				if(!fs.existsSync(path.join(this.DATA_DIR, `${f}`))){
					fs.copyFileSync(path.join(nw.__dirname, `${f}`), path.join(this.DATA_DIR, `${f}`));
				}
			});
			// Проверка на существование background
			if(!fs.existsSync(path.join(this.DATA_DIR, `background`))){
				fs.mkdirSync(path.join(this.DATA_DIR, `background`), { recursive: true, force: true });
			}
		} catch(e) {
			this.error(e);
		}
	}
	// Очистка листа станций
	clearStattions() {
		const genre = this.genreList;
		const list = this.radioList;
		const setters = new Set();
		this.stop();
		// Очищаем список радио
		while (list.firstChild) {
			list.removeChild(list.firstChild);
		}
		// Очищаем список станций
		while (genre.firstChild) {
			genre.removeChild(genre.firstChild);
		}
		dataStations.active = 0;
		dataStations.genre = [];
		dataStations.presetindex = this.presetsSelectIndex;
		dataStations.presetsRandom = dataStations.presetsRandom ? true : false;
		dataStations.stations = {};
		// Если каталог не существует
		if(!fs.existsSync(DATA_DIR)) {
			fs.mkdirSync(DATA_DIR, { recursive: true, force: true });
		}
		// Очистка каталога
		[...fs.readdirSync(this.DATA_DIR, { withFileTypes: true })]
			// Получить только файлы
			.filter(f => f.isFile())
			// Сформировать полный путь
			.map(f => path.join(this.DATA_DIR, f.name))
			// Прбежаться и удалить
			.forEach(f => {
				try {
					fs.unlinkSync(f);
				} catch (e) {
					this.log(e);
				}
			});
		this.saveStations();
	}
	// Запрос метаданных потока. Работает от id станции
	getMetaData() {
		metainterval && clearTimeout(metainterval);
		const el = this.radioList.querySelector(`li.active`);
		const { id, name, stream, title } = el.dataset;
		icy.get(player.stream, (res) => {
			const _title = title.length > 5 ? title : name;
			res.on('metadata', (metadata) => {
				const parsed = icy.parse(metadata);
				const $_title = String(parsed.StreamTitle).trim();
				const icon = `${this.GLOB_SERVER.URL}/` + (fs.existsSync(path.join(this.DATA_DIR, `${id}_big.png`)) ? `${id}_big.png?` : `image_big.png?`) + (new Date()).getTime();
				const favicon = `${this.GLOB_SERVER.URL}/` + (fs.existsSync(path.join(this.DATA_DIR, `${id}.png`)) ? `${id}.png?` : `image_fav.png?`) + (new Date()).getTime();
				if(player.isPlaying()){
					if($_title.length > 5) {
						this.title = $_title + ' | ' + name + ' | ' + locale.get("appName");
					}else{
						this.title = name + ' | ' + locale.get("appName");
						dataStations.notify && chrome.notifications.clear(String(nw.App.manifest.name));
					}
					if($_title !== _title && $_title.length > 5) {
						el.setAttribute("data-title", $_title);
						// Отправить сообщение для отображения
						this.spawnNotification({icon: icon, favicon: favicon, id: id, name: name, title: $_title});
					} else {
						el.setAttribute("data-title", _title);
					}
					metainterval = setTimeout(() => this.getMetaData(), 5000);
				} else {
					el.setAttribute("data-title", name);
					this.title = locale.get("appName");
				}
			}).on("error", (err) => {
				this.console.log('err', err);
				player.isPlaying() ? (
					this.title = name + ' | ' + locale.get("appName"),
					metainterval = setTimeout(() => this.getMetaData(), 5000)
				) : (
					el.setAttribute("data-title", name),
					this.title = locale.get("appName")
				);
			});
		});
		//
	}
	// Отправка сообщения для отображения
	spawnNotification(data) {
		const {icon, favicon, id, name, title} = data;
		this.window.navigator.mediaSession.metadata = new this.window.MediaMetadata({
			title: name,
			artist: title,
			album: "",
			artwork: [
				{
					src: favicon,
					type: "image/png",
					sizes: '180x180',
				}
			]
		});
		this.vizualizer && this.vizualizer.launchSongTitleAnim(`${title}`);
		const iconPath = path.join(DATA_DIR, `${id}.png`);
		try {
			dataStations.notify && notifier.notify({
				title: name,
				message: title,
				icon: iconPath,
				type: 'info',
				sound: false,
				id: 'yourradio',
				appID: locale.get('appName'),
				application: nw.process.execPath
			});
		} catch(e){
			this.console.error(e);
		}
	}
	// Прокрутка к элементу
	scrollToEl(el) {
		const wrap = this.document.querySelector('main > .container > .row');
		if (!wrap) return;
		const wrapRect = wrap.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		// Позиция элемента относительно контейнера (в пикселях)
		const elTopRelative = elRect.top - wrapRect.top;
		const elBottomRelative = elTopRelative + elRect.height;
		const containerHeight = wrapRect.height;
		// Элемент выше видимой области контейнера
		const isAboveTop = elTopRelative < 0;
		// Элемент ниже видимой области контейнера
		const isBelowBottom = elBottomRelative > containerHeight;
		if (isAboveTop) {
			// Сначала сбрасываем скролл контейнера в начало
			wrap.scrollTo({ top: 0, left: 0 });
			// Затем плавно показываем элемент сверху
			el.scrollIntoView({ block: 'start' });
		} else if (isBelowBottom) {
			// Показываем элемент снизу
			el.scrollIntoView({ block: 'end' });
		}
	}
	// Прокрутка к активному элементу
	scrollActive() {
		const el = this.document.querySelector('#radio-list > li.active');
		if (!el) return;
		this.scrollToEl(el);
	}
	// Тайтл
	get title() {
		try {
			return this.document.title;
		} catch (e) {
			return "";
		}
	}
	set title(value) {
		try {
			this.win.name = value;
			this.win.title = value;
			this.document.title = value;
			this.document.querySelector("#TitleBar-text span").textContent = value;
		} catch (e) {}
	}
	// Громкость от 0 до 100
	get volume() {
		return volume;
	}
	set volume(value) {
		var inp;
		if(!Number.isNaN(Number(value))){
			value = volume = Math.min(100, Math.max(0, parseFloat(value)));
			player.volume = volume / 100;
			if(inp = this.document.querySelector("#volume")){
				inp.value = value;
				inp.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
			}
		}
		dataStations.volume = player.volume;
	}
	// Воспроизведение
	play() {
		const list = this.radioList;
		const el = list.querySelector("li.active");
		if(!el) {
			this.stop();
			return;
		}
		el.setAttribute('data-title', el.dataset.name);
		try {
			const { id, name, stream, genre } = el.dataset;
			this.title = `${name} | ${locale.get("appName")}`;
			player.stream = stream;
			player.play();
			this.title = name + " | " + locale.get('appName');
			this.window.navigator.mediaSession.metadata = new this.window.MediaMetadata({
				title: locale.get("appName"),
				artist: name,
				album: "",
				artwork: [
					{
						src: `${this.GLOB_SERVER.URL}/${id}.png`,
						type: "image/png",
						sizes: '180x180',
					}
				]
			});
			this.getMetaData(id);
		} catch (e) {
			this.stop();
		}
		dataStations.notify && chrome.notifications.clear(String(nw.App.manifest.name));
	}
	// Остановка
	stop() {
		clearTimeout(metainterval);
		player.stop();
		this.title = locale.get('appName');
		const list = this.radioList;
		const el = list.querySelector("li.active");
		el && el.setAttribute('data-title', el.dataset.name);
		dataStations.notify && chrome.notifications.clear(String(nw.App.manifest.name));
		this.title = locale.get("appName");
	}
	// Предыдущий
	prev() {
		this.stop();
		const currentEl = this.radioList.querySelector('.active');
		const items = Array.from(this.radioList.querySelectorAll('li:not(.hidden)'));
		if (items.length === 0) {
			// вообще нет видимых — тут уже точно ничего не сделать
			return;
		}
		const currentIndex = items.findIndex(el => el.classList.contains('active'));
		let targetIndex;
		if (currentIndex !== -1) {
			// Есть активный среди видимых — идём к предыдущему с зацикливанием
			targetIndex = (currentIndex - 1 + items.length) % items.length;
		} else {
			// Активного среди видимых нет — для prev выбираем последний видимый
			targetIndex = items.length - 1;
		}
		const prevEl = items[targetIndex];
		// Убираем active со старого (если он был)
		if (currentEl) {
			// Удаляем классы
			currentEl.classList.remove('active');
			currentEl.classList.remove('play');
			currentEl.classList.remove('preload');
			currentEl.classList.add("stop");
			// Устанавливаем data-title
			currentEl.setAttribute("data-title", currentEl.dataset.name);
		}
		// Ставим на новый
		prevEl.classList.add('active');
		this.play();
		this.scrollActive();
	}
	// следующий
	next() {
		this.stop();
		const currentEl = this.radioList.querySelector('.active');
		const items = Array.from(this.radioList.querySelectorAll('li:not(.hidden)'));
		if (items.length === 0) {
			return;
		}
		const currentIndex = items.findIndex(el => el.classList.contains('active'));
		let targetIndex;
		if (currentIndex !== -1) {
			// Есть активный среди видимых — идём к следующему с зацикливанием
			targetIndex = (currentIndex + 1) % items.length;
		} else {
			// Активного среди видимых нет — для next выбираем первый видимый
			targetIndex = 0;
		}
		const nextEl = items[targetIndex];
		if (currentEl) {
			// Удаляем классы
			currentEl.classList.remove('active');
			currentEl.classList.remove('play');
			currentEl.classList.remove('preload');
			currentEl.classList.add("stop");
			// Устанавливаем data-title
			currentEl.setAttribute("data-title", currentEl.dataset.name);
		}
		nextEl.classList.add('active');
		this.play();
		this.scrollActive();
	}
	isNumber(value) {
		return typeof value === 'number' && Number.isFinite(value) && value !== true && value !== false;
	}
	get presetsSelectIndex() {
		return dataStations.presetindex;
	}
	set presetsSelectIndex(value) {
		const num = Number(value);
		this.console.log(this.presetsNames.length);
		const max = this.presetsNames.length - 1;
		dataStations.presetindex = !Number.isFinite(num) ? -1 : Math.max(-1, Math.min(Math.floor(num), max));
	}
	// Сервер
	get server() {
		return this.#ready;
	}
	set server(value) {
		this.error("Нельзя задать значение app.server");
	}
	// Директория
	get DATA_DIR() {
		return DATA_DIR;
	}
	set DATA_DIR(value) {
		this.error("Нельзя задать значение app.DATA_DIR");
	}
};

module.exports = (win, window, document) => {
	return {
		app: new App(win, window, document)
	};
};
