//Set position
(function(window){
	nw.Screen.Init();
	var w = 400,
		h = 500,
		state = (localStorage.getItem('canvas_state') == "true");
	w = state ? 600 : 400;
	const win = nw.Window.get();
	let screen = nw.Screen.screens[0],
		x = parseInt(screen.bounds.x + (screen.bounds.width - w) / 2) || 0,
		y = parseInt(screen.bounds.y + (screen.bounds.height - 500) / 2) || 0;
	win.restore();
	win.moveTo(x, y);
	win.setMinimumSize(w, 500);
	win.resizeTo(w, 500);
}(window));
(function($){
	if(nw.process.versions["nw-flavor"] == "sdk"){
		nw.Window.get().showDevTools();
	}
	// Open url in default browser
	$(document).on("click", "a[target='_blank']", function(e){
		e.preventDefault();
		nw.Shell.openExternal(this.href);
		return !1;
	});
	const 	gui = require('nw.gui'),
			fs = require('fs'),
			json = {},
			win = nw.Window.get(),
			titleBarText = $('#TitleBar-text > span'),
			miniBtn = $('#minimized'),
			minimizePath = 'M 0,5 10,5 10,6 0,6 Z',
			restoreBtn = $('#restored'),
			restorePath = 'm 2,1e-5 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z',
			maximizePath = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z',
			maxRes = $('svg path', restoreBtn),
			closeBtn = $('#close'),
			closePath = 'M 0,0 0,0.7 4.3,5 0,9.3 0,10 0.7,10 5,5.7 9.3,10 10,10 10,9.3 5.7,5 10,0.7 10,0 9.3,0 5,4.3 0.7,0 Z',
			dir = nw.App.dataPath + "/radio",
			dirFile = dir + "/data.json";
	let isMaximized = false,
		md5Previos = null,
		win_state = true;
	$(document).on('click', "#minimized, #restored, #close", function(e){
		let eId = e.currentTarget.id;
		if(eId == "minimized" || eId == "restored" || eId == "close"){
			e.preventDefault();
			eId == "minimized" ? win.minimize() : (eId == "close" ? nw.App.quit() : (isMaximized ? win.restore() : win.maximize()))
			return !1;
		}
	});
	win.on('maximize', function(e){
		isMaximized = !0;
		maxRes.attr({d: restorePath});
		tray_mini_restore.label = "  " + getMessage("minimize");
		tray_mini_restore.icon = "images/tray_minimize.png";
		win_state = !0;
	}).on('restore', function(e){
		isMaximized = !1;
		maxRes.attr({d: maximizePath});
		tray_mini_restore.label = "  " + getMessage("minimize");
		tray_mini_restore.icon = "images/tray_minimize.png";
		win_state = !0;
	}).on('minimize', function() {
		tray_mini_restore.label = "  " + getMessage("restore");
		tray_mini_restore.icon = "images/tray_" + (isMaximized ? "maximize.png" : "normal.png");
		win.setShowInTaskbar(false);
		win_state = !1;
	});
	const 	quitError = function(error){
				alert(error);
				nw.App.quit();
			},
			getMessage = function(msg) {
				return chrome.i18n.getMessage(msg);
			},
			setLocale = function(){
				setTitle(getMessage('appName'));
			},
			readFile = function(file){
				$("main").addClass('loading');
				console.log(`Read file ${file}`);
				setTimeout(function(){
					$("main").removeClass('loading');
				}, 2000);
			},
			writeFile = function(file){
				console.log(`Write file ${file}`);
			},
			setTitle = function(title) {
				title = title.replace(/\s+/g, ' ');
				titleBarText.text(title);
				win.title = title;
				$('#TitleBar').attr({title: title});
			},
			tray = new nw.Tray({
				title: getMessage('appName'),
				tooltip: getMessage('appName'),
				icon: 'favicon.png',
				/*click: function(e){
					console.log(e)
				}*/
			}),
			trayMenu = new nw.Menu(),
			tray_close = new nw.MenuItem({
				label: "  " + getMessage("close"),
				icon: "images/tray_close.png",
				click: function() {
					nw.App.quit();
				}
			}),
			tray_mini_restore = new nw.MenuItem({
				label: "  " + getMessage("minimize"),
				icon: "images/tray_minimize.png",
				click: function() {
					win_state ? (
						win.minimize(),
						tray_mini_restore.label = "  " + getMessage("restore")
					) : (
						win.show(),
						tray_mini_restore.label = "  " + getMessage("minimize")
					);
				}
			});
	//setTitle('Ваше Радио');
	setLocale();
	// WinTray
	tray.menu = trayMenu;
	trayMenu.append(tray_mini_restore);
	trayMenu.append(tray_close);
	// Проверяем директорию и файл
	fs.mkdir(dir, 0777, (err) => {
		if (err) {
			if (err.code == 'EEXIST'){
				// Существует
				fs.access(dirFile, fs.constants.F_OK | fs.constants.W_OK, (err1) => {
					if (err1) {
						// Несуществует
						if(err1.code === 'ENOENT'){
							// Запишем в файл дефолт
							fs.writeFile(dirFile, JSON.stringify(json), 'utf8', (err2) => {
								if(!err2){
									// Нет ошибки записи. Следим за файлом
									fs.watchFile(dirFile, { interval: 1000 }, () => {
										readFile(dirFile)
									});
									// Читаем файл
									readFile(dirFile)
								}else{
									// Закрываем программу
									quitError(getMessage('appError'));
								}
							});
						}else{
							// С аттрибутами чо-то не то.
							// Пробуем установить
							fs.chmod(dirFile, 0777, (err3) => {
								if (err3){
									// Закрываем программу
									quitError(getMessage('appError'));
								}else{
									// Нет ошибки записи. Следим за файлом
									fs.watchFile(dirFile, { interval: 1000 }, () => {
										readFile(dirFile);
									});
									// Читаем файл
									readFile(dirFile);
								}
							});
						}
					} else {
						// Следим за файлом
						fs.watchFile(dirFile, { interval: 1000 }, () => {
							readFile(dirFile);
						});
						// Читаем файл
						readFile(dirFile);
					}
				});
			} else {
				// Закрываем программу
				quitError(getMessage('appError'));
			}
		} else {
			// Создали
			fs.writeFile(dirFile, JSON.stringify(json), 'utf8', (err) => {
				if(!err){
					// Следим за файлом
					fs.watchFile(dirFile, { interval: 1000 }, () => {
						console.log(`4 watch ${dirFile}`);
						readFile(dirFile);
					});
					// Читаем файл
					readFile(dirFile);
				}else{
					// Закрываем программу
					quitError(getMessage('appError'));
				}
			});
		}
	});
	
}(jQuery))