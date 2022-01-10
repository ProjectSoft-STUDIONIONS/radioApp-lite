//Set position
(function(window){
	nw.Screen.Init();
	var w = nw.App.manifest.window.width,
		h = nw.App.manifest.window.height,
		state = (localStorage.getItem('canvas_state') == "true");
	//w = state ? w : w;
	let screen = nw.Screen.screens[0],
		x = parseInt(screen.bounds.x + (screen.bounds.width - w) / 2) || 0,
		y = parseInt(screen.bounds.y + (screen.bounds.height - h) / 2) || 0,
		wid = screen.work_area.width,
		hei = screen.work_area.height;
	h = h > hei ? hei : h;
	w = w > wid ? wid : w;
	win.moveTo(x, y);
	win.setMinimumSize(w, h);
	win.resizeTo(w, h);
}(window));

(function($){
	const 	miniBtn = $('#minimized'),
			restoreBtn = $('#restored'),
			closeBtn = $('#close'),
			settingsBtn = $('#settings'),
			maxRes = $('svg path', restoreBtn),
			minimizePath = 'M 0,5 10,5 10,6 0,6 Z',
			restorePath = 'm 2,1e-5 0,2 -2,0 0,8 8,0 0,-2 2,0 0,-8 z m 1,1 6,0 0,6 -1,0 0,-5 -5,0 z m -2,2 6,0 0,6 -6,0 z',
			maximizePath = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z',
			closePath = 'M 0,0 0,0.7 4.3,5 0,9.3 0,10 0.7,10 5,5.7 9.3,10 10,10 10,9.3 5.7,5 10,0.7 10,0 9.3,0 5,4.3 0.7,0 Z',
			disableDragDrop = function(e){
				e.preventDefault();
				e.stopPropagation();
				return !1;
			};

	let isMaximized = false,
		md5Previos = null,
		win_state = true;

	$(document).on('click', "#minimized, #restored, #close", function(e){
		let eId = e.currentTarget.id;
		if(eId == "minimized" || eId == "restored" || eId == "close"){
			e.preventDefault();
			eId == "minimized" ? win.minimize() : (eId == "close" ? win.close() : (isMaximized ? win.restore() : win.maximize()))
			return !1;
		}
	});
	$("#radio-list").attr({'data-title': locale.notStations})
	miniBtn.attr({title: locale.minimize});
	restoreBtn.attr({title: locale.default});
	closeBtn.attr({title: locale.close});
	settingsBtn.attr({title: locale.settingsTitle});
	restoreBtn.attr({title: (isMaximized ? locale.restore : locale.default)});
	win.on('maximize', function(e){
		isMaximized = !0;
		maxRes.attr({d: restorePath});
		restoreBtn.attr({title: locale.restore});
		tray_mini_restore.label = "  " + locale.minimize;
		tray_mini_restore.icon = "images/tray_minimize.png";
		win.setShowInTaskbar(true);
		win_state = !0;
	}).on('restore', function(e){
		isMaximized = !1;
		restoreBtn.attr({title: locale.default});
		maxRes.attr({d: maximizePath});
		tray_mini_restore.label = "  " + locale.minimize;
		tray_mini_restore.icon = "images/tray_minimize.png";
		win.setShowInTaskbar(true);
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
				icon: 'favicon.png'
			}),
			trayMenu = new nw.Menu(),
			tray_close = new nw.MenuItem({
				label: "  " + locale.close,
				icon: "images/tray_close.png",
				click: function() {
					win.close();
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
						win.setShowInTaskbar(false),
						tray_mini_restore.label = "  " + locale.minimize
					);
				}
			});
	tray.menu = trayMenu;
	trayMenu.append(tray_mini_restore);
	trayMenu.append(tray_close);
	tray.on('click', function(){
		win_state ? (
			win.minimize(),
			tray_mini_restore.label = "  " + locale.restore
		) : (
			win.show(),
			tray_mini_restore.label = "  " + locale.minimize
		);
	})
	// Open url in default browser
	$(document).on("click", "a[target='_blank']", function(e){
		e.preventDefault();
		let lng = locale.goToDev + ` ${this.href} ?`;
		if (confirm(lng)) {
			nw.Shell.openExternal(this.href);
		} else {
			alert(locale.notToDev);
		}
		return !1;
	});
	const play_stop = function(){
			var li = $("#radio-list li.active"),
				icon = $('span.icons', li);
			icon.click();
			scrollTo();
		},
		prev = function(){
			var li = $("#radio-list li.active"),
				len = $("#radio-list li").length;
			if(li.length){
				let $pn = li.prev();
				if(!$pn.length){
					$pn =  $($("#radio-list li")[len - 1]);
				}
				if($pn.length){
					$("#radio-list li").removeClass('active play preload').addClass('stop');
					player.stop();
					$pn.addClass('active');
					//stop();
					play_stop();
				}
			}
		},
		next = function(){
			var li = $("#radio-list li.active"),
				len = $("#radio-list li").length;
			if(li.length){
				let $pn = li.next();
				if(!$pn.length){
					$pn =  $($("#radio-list li")[0]);
				}
				if($pn.length){
					$("#radio-list li").removeClass('active play preload').addClass('stop');
					player.stop();
					$pn.addClass('active');
					//stop();
					play_stop();
				}
			}
		}
	window.navigator.mediaSession.setActionHandler('play', play_stop);
	window.navigator.mediaSession.setActionHandler('pause', play_stop);
	window.navigator.mediaSession.setActionHandler('previoustrack', prev);
	window.navigator.mediaSession.setActionHandler('nexttrack', next);
}(jQuery))