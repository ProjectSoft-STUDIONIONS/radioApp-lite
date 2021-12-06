
!(function($){
	const 	deleteRadioPath = function (path) {
				let files = [];
				if( fs.existsSync(path) ) {
					files = fs.readdirSync(path);
					files.forEach(function(file,index){
						let curPath = path + "/" + file;
						if(fs.statSync(curPath).isDirectory()) {
							deleteRadioPath(curPath);
						}
						fs.unlinkSync(curPath);
					});
				}
			},
			addListItem = async function(data){
				try{
					if(data.name && data.stream){
						let _id = data.id,
							_name = data.name,
							_stream = data.stream,
							has = "?" + (new Date()).getTime(),
							_icon = ((fs.existsSync(dir + '\\' + _id + '.png'))	? dir + '\\' + _id + '.png' : 'favicon.png') + has,
							_tmp = $(`<li id="st_${_id}" class="radio-item stop">
							<div class="radio-item-box">
								<div class="radio-item-icon">
									<span class="icons"></span>
									<span class="favicon"><img src="${_icon}" alt="${_name}"></span>
								</div>
								<div class="radio-item-wrap">
									<span class="station-name">${_name}</span>
								</div>
								<div class="radio-item-handler">
									<span class="icon-handler">
										<span class="top">▲</span>
										<span class="center">●</span>
										<span class="bottom">▼</span>
									</span>
								</div>
							</div>
						</li>`);
						_tmp.data({
							id: _id,
							name: _name,
							stream: _stream
						});
						$('#radio-list').append(_tmp);
						if(active == _id){
							_tmp.addClass('active');
						}
						return !0;
					}
					return !1;
				}catch(e){
					return !1;
				}
			},
			readFile = async function(){
				let file = dirFile,
					_json = {
						stations: {},
						active: active,
						notify: notify
					};
				$('#radio-list').empty();
				$("main").addClass('loading');
				try {
					_json = fs.readFileSync(file);
					_json = decoder.write(_json);
					_json = JSON.parse(_json);
					json.stations = _json["stations"];
					json.active = active = _json["active"] ? parseInt(_json["active"]) : active;
					json.notify = notify = _json["notify"] ? _json["notify"] : notify;
					for (let prop in json.stations) {
						let st = json.stations[prop];
						st.id = prop;
						await addListItem(st);
					}

				} catch(e){
					//
				} finally {
					$("main").removeClass('loading');
				}
				return _json;
			},
			writeFile = function(isRead){
				isRead = typeof isRead === 'boolean' ? isRead : false;
				var file = dirFile,
					_output = "{}";
				json.stations = {};
				json.active = active;
				json.notify = notify;
				$('#radio-list li').each(function(){
					let $this = $(this),
						data = $this.data(),
						id = $this.prop('id').split('_')[1];
					json.stations[id] = {
						name: data.name,
						stream: data.stream
					};
				});
				_output = JSON.stringify(json);
				fs.writeFile(dirFile, _output, 'utf8', (err) => {
					/**
					 * If there is no error, then we read the file, otherwise we close the program 
					 **/
					!err ? (isRead && readFile()) : quitError(locale.appError);
				});
			},
			deleteItem = function(id){
				$("*", "#st_" + id).unbind('click.radioDialog');
				$("#st_" + id).remove();
				let fav = dir + `\\${id}.png`;
				if(fs.existsSync(fav)){
					fs.unlinkSync(fav);
				}
				writeFile(false);
			},
			setTitle = function(title) {
				title = title.replace(/\s+/g, ' ');
				$('#TitleBar-text > span').text(title);
				win.title = title;
			},
			updateSessionMetaData = function() {
				let icon;
				if(player.isPlaying()){
					let $li = $('li.radio-item.active'),
						data = $li.data(),
						id = data.id,
						title = data.name,
						has = (new Date()).getTime();
					icon = (fs.existsSync(dir + '\\' + id + '.png')	? dir + '\\' + id + '.png' : 'favicon.png');
					icon  = "data:image/png;base64," + fs.readFileSync(icon).toString('base64');
					navigator.mediaSession.metadata = new MediaMetadata({
						title: locale.appName,
						artist: title,
						album: "",
						artwork: [{src: icon, type: "image/png", sizes: '128x128'}]
					});
				}else{
					icon  = "data:image/png;base64," + fs.readFileSync('favicon.png').toString('base64');
					navigator.mediaSession.metadata = new MediaMetadata({
						title: locale.appName,
						artist: title,
						album: "",
						artwork: [{src: icon, type: "image/png", sizes: '128x128'}]
					});
				}
			},
			json = {
				stations: {},
				active: 0,
				notify: false
			},
			player = new AudioPlayer(document);
	var active = json.active,
		notify = json.notify;
	/**
	 * Checking the directory and file
	 **/
	fs.mkdir(dir, 0777, (err) => {
		if (err) {
			if (err.code == 'EEXIST'){
				/**
				 * Exists. Checking the file
				 **/
				fs.access(dirFile, fs.constants.F_OK | fs.constants.W_OK, (err1) => {
					if (err1) {
						/**
						 * Does not exist
						 **/
						if(err1.code === 'ENOENT'){
							/**
							 * Create and write default to the file
							 **/
							writeFile(true);
						}else{
							/**
							 * There is something wrong with the attributes.
							 * Trying to install 
							 **/
							fs.chmod(dirFile, 0777, (err3) => {
								if (err3){
									/**
									 * Close the program 
									 **/
									quitError(locale.appError);
								}else{
									/**
									 * Reading the file 
									 **/
									readFile();
								}
							});
						}
					} else {
						/**
						 * Reading the file 
						 **/ 
						readFile();
					}
				});
			} else {
				/**
				 * Close the program 
				 **/
				quitError(locale.appError);
			}
		} else {
			/**
			 * Create and write default to the file
			 **/ 
			writeFile(true);
		}
	});
	/**
	 * Context Menu Constants 
	 **/
	const	copyStationItem = new nw.MenuItem({
				label: locale.copyTitle,
				type: 'normal'
			}),
			addStationItem = new nw.MenuItem({
				label: locale.insertTitle,
				type: 'normal',
				click: function() {
					$.radioDialog.show({
						type: 'insert'
					}, function(args){
						console.log(args);
						if(args.type == 'insert'){
							writeFile(false);
							addListItem(args);
						}
					});
				}
			}),
			editStationItem = new nw.MenuItem({
				label: locale.editTitle,
				type: 'normal'
			}),
			removeStationItem = new nw.MenuItem({
				label: locale.deleteTitle,
				type: 'normal'
			}),
			separator = nw.MenuItem({
				type: 'separator'
			}),
			exportStations = new nw.MenuItem({
				label: locale.exportTitle,
				type: 'normal',
				click: function() {
					console.log("Экспорт станций");
					$.radioDialog.show({
						type: 'export'
					}, function(args){
						if(args.type == 'export'){
							console.log(args.type);
							/**
							 * Export radio station's
							 **/
						} else {

						}
					});
				}
			}),
			importStations = new nw.MenuItem({
				label: locale.importTitle,
				type: 'normal',
				click: function() {
					$.radioDialog.show({
						type: 'import'
					}, function(args){
						if(args.type == 'import'){
							console.log(args.type);
							/**
							 * Import radio station's
							 **/
						} else {

						}
					});
				}
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
	menuLi.append(removeStationItem);
	menuLi.append(separator);
	menuLi.append(exportStations);
	menuLi.append(importStations);

	$(document).on('click', '#radio-list span.icons', function(e){
		e.preventDefault();
		/**
		 * play & stop radio
		 **/
		var _li = $(this).closest('li'),
			data = _li.data();
		(_li.hasClass('active')) ? (
			_li.hasClass('play') ? (
				_li.removeClass('play preload').addClass('stop'),
				player.stop()
			) : (
				_li.removeClass('stop').addClass('play preload'),
				player.stream = data.stream,
				player.play()
			 )
		) : (
			$("#radio-list li").removeClass('active preload play').addClass('stop'),
			_li.addClass('active preload play').removeClass('stop'),
			player.stream = data.stream,
			player.play()
		);
		json.active = active = _li.prop('id').split('_')[1];
		return !1;
	}).on('contextmenu', '#radio-list > li', function(e){
		/**
		 * Context menu radio-lis li
		 **/
		e.preventDefault();
		var ev = e.originalEvent,
			$ct = $(e.currentTarget),
			data = $ct.data(),
			stn = " - «" + data.name + "»";
		editStationItem.label = locale.editTitle + stn;
		removeStationItem.label = locale.deleteTitle + stn;
		copyStationItem.label = locale.copyTitle + stn;
		/**
		 * copy link stream
		 **/
		copyStationItem.click = function(){
			data.type = 'copy';
			navigator.clipboard.writeText(data.stream).then(() => {
				$.radioDialog.show(data, function(args){});
			}).catch(err => {
				console.log('Something went wrong', err);
			});
			copyStationItem.click = null;
		};
		/**
		 * edit station item
		 **/
		editStationItem.click = function(){
			data.type = 'edit';
			$.radioDialog.show(data, function(args){
				if(args.type == data.type){
					let $li = $('#st_' + args.id),
						img = $('img', $li),
						name = $('.station-name', '#st_' + args.id),
						has = "?" + (new Date()).getTime(),
						_icon = ((fs.existsSync(dir + '\\' + args.id + '.png'))	? dir + '\\' + args.id + '.png' : 'favicon.png') + has;
					
					name.text(args.name);
					$('#st_' + args.id).data({
						id: args.id,
						name: args.name,
						stream: args.stream
					});
					if($li.hasClass('active') && $li.hasClass('play')){
						/**
						 * stop radio
						 **/
						player.stop();
						player.stream = args.stream,
						player.play();
					}
					img.attr({
						alt: args.name,
						src: _icon
					});
					writeFile(false);
				}
			});
			editStationItem.click = null;
		};
		/**
		 * remove station item
		 **/
		removeStationItem.click = function(){
			data.type = 'delete';
			$.radioDialog.show(data, function(args){
				if(args.type == data.type){
					if($('#st_' + args.id).hasClass('active')){
						/**
						 * stop radio
						 **/
						 player.stop();
					}
					$('#st_' + args.id).remove();
					deleteItem(args.id);
				}
			});
			removeStationItem.click = null;
		}
		menuLi.popup(parseInt(ev.x), parseInt(ev.y));
		return !1;
	}).on('contextmenu', 'main, footer', function(e){
		/**
		 * Context menu default
		 **/
		e.preventDefault();
		let ev = e.originalEvent;
		menu.popup(parseInt(ev.x), parseInt(ev.y));
		return !1;
	}).on('click', '.write', function(e){
		e.preventDefault();
		/**
		 * Test Click's
		$.radioDialog.show({
			type: 'insert'
		}, function(args){
			console.log(args);
		});
		**/
		return !1;
	});
	/**
	 * Player events
	 **/
	player.addEventListener('statechange', function(e){
		console.log(e)
		if(e.type=='statechange'){
			let $li = $('.radio-item.active');
			switch(e.audioev){
				case 'play':
					$li.removeClass('stop').addClass('play preload');
					break;
				case 'playing':
					e.bufering ?  $li.removeClass('stop').addClass('play preload') : $li.removeClass('stop preload').addClass('play');
					break;
				case 'stop':
					$li.addClass('stop').removeClass('play preload');
					break;
			}
			updateSessionMetaData();
		}
	});
	/**
	 * Volume range
	 **/
	$("#volume").on('input', function(e){
		e.preventDefault();
		let s = parseFloat(this.value / 100);
		player.volume = s;
		return !1;
	}).trigger('input');
	/**
	 * Adding UI Sortable
	 **/
	$( "#radio-list" ).sortable({
		axis: "y",
		cursor: "row-resize",
		handle: ".radio-item-handler",
		items: "> li",
		update: function(event, ui){
			writeFile(false);
		}
	});
	/**
	 * Adding a close event to nwWindow
	 **/
	win.on('close',function(){
		writeFile(false);
		nw.App.quit();
	});
	/**
	 * Set App title
	 **/
	setTitle(locale.appName);
}(jQuery));