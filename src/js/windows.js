//Set position
(function(window){
	nw.Screen.Init();
	var w = 400,
		h = 500,
		state = (localStorage.getItem('canvas_state') == "true");
	w = state ? 600 : 400;
	let screen = nw.Screen.screens[0],
		x = parseInt(screen.bounds.x + (screen.bounds.width - w) / 2) || 0,
		y = parseInt(screen.bounds.y + (screen.bounds.height - 500) / 2) || 0;
	win.restore();
	win.moveTo(x, y);
	win.setMinimumSize(w, 500);
	win.resizeTo(w, 500);
}(window));
(function($){
	const 	miniBtn = $('#minimized'),
			restoreBtn = $('#restored'),
			closeBtn = $('#close'),
			maxRes = $('svg path', restoreBtn),
			minimizePath = 'M 0,5 10,5 10,6 0,6 Z',
			restorePath = 'm 2,1e-5 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z',
			maximizePath = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z',
			closePath = 'M 0,0 0,0.7 4.3,5 0,9.3 0,10 0.7,10 5,5.7 9.3,10 10,10 10,9.3 5.7,5 10,0.7 10,0 9.3,0 5,4.3 0.7,0 Z';
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
	$("#radio-list").attr({'data-title': locale.notStations})
	miniBtn.attr({title: locale.minimize});
	restoreBtn.attr({title: locale.default});
	closeBtn.attr({title: locale.close});
	restoreBtn.attr({title: (isMaximized ? locale.restore : locale.default)});
	win.on('maximize', function(e){
		isMaximized = !0;
		maxRes.attr({d: restorePath});
		restoreBtn.attr({title: locale.restore});
		tray_mini_restore.label = "  " + locale.minimize;
		tray_mini_restore.icon = "images/tray_minimize.png";
		win_state = !0;
	}).on('restore', function(e){
		isMaximized = !1;
		restoreBtn.attr({title: locale.default});
		maxRes.attr({d: maximizePath});
		tray_mini_restore.label = "  " + locale.minimize;
		tray_mini_restore.icon = "images/tray_minimize.png";
		win_state = !0;
	}).on('minimize', function() {
		tray_mini_restore.label = "  " + locale.restore;
		tray_mini_restore.icon = "images/tray_" + (isMaximized ? "maximize.png" : "normal.png");
		restoreBtn.attr({title: (isMaximized ? locale.restore : locale.default)});
		win.setShowInTaskbar(false);
		win_state = !1;
	});
	const 	tray = new nw.Tray({
				title: locale.appName,
				tooltip: locale.appName,
				icon: 'favicon.png',
				/*click: function(e){
					console.log(e)
				}*/
			}),
			trayMenu = new nw.Menu(),
			tray_close = new nw.MenuItem({
				label: "  " + locale.close,
				icon: "images/tray_close.png",
				click: function() {
					nw.App.quit();
				}
			}),
			tray_mini_restore = new nw.MenuItem({
				label: "  " + locale.minimize,
				icon: "images/tray_minimize.png",
				click: function() {
					win_state ? (
						win.minimize(),
						tray_mini_restore.label = "  " + locale.restore
					) : (
						win.show(),
						tray_mini_restore.label = "  " + locale.minimize
					);
				}
			});
	// WinTray
	tray.menu = trayMenu;
	trayMenu.append(tray_mini_restore);
	trayMenu.append(tray_close);
	// Open url in default browser
	$(document).on("click", "a[target='_blank']", function(e){
		e.preventDefault();
		if (confirm(locale.goToDev)) {
			nw.Shell.openExternal(this.href);
		} else {
			alert(locale.notToDev);
		}
		return !1;
	});
}(jQuery))