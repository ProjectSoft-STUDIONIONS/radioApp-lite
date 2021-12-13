
!(function($){
	$('p.left').removeClass('visible');
	var elCrop = document.getElementById('cropTmp'),
		tmpCrop = new Croppie(elCrop, {
			viewport: {
				width: 180,
				height: 180,
				type: 'circle'
			},
			boundary: {
				width: 180,
				height: 180
			},
			showZoomer: false,
			enableOrientation: true,
			mouseWheelZoom: false,
			enableExif: true
		}),
		$clear_stations = $("#clear_stations"),
		$notify = $("#notify"),
		$loadDefault = $("#loadDefault"),
		$settingsBlock = $('.settings-block'),
		$okSettings = $("#okSettings"),
		$noSettings = $("#noSettings");
	const 	deleteRadioPath = function (path) {
				let files = [];
				if( fs.existsSync(path) ) {
					files = fs.readdirSync(path);
					files.forEach(function(file,index, arr){
						let curPath = path + "/" + file,
							ext = ph.extname(curPath).toLowerCase();
						if(!fs.statSync(curPath).isDirectory()) {
							if(ext != '.json'){
								fs.unlinkSync(curPath);
							}
							//deleteRadioPath(curPath);
							//fs.unlinkSync(curPath);
						}
						//fs.unlinkSync(curPath);
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
					volume = 0.5,
					_json = {
						stations: {},
						active: active,
						notify: notify,
						volume: volume
					};
				$('#radio-list').empty();
				$("main").addClass('loading');
				try {
					let t = 0;
					_json = fs.readFileSync(file);
					_json = decoder.write(_json);
					_json = JSON.parse(_json);
					json.stations = _json["stations"];
					json.active = active = _json["active"] ? parseInt(_json["active"]) : active;
					json.notify = notify = _json["notify"] ? _json["notify"] : notify;
					$notify.prop('checked', notify);
					_json.volume = parseFloat(_json["volume"]) >= 0 ? parseFloat(_json["volume"]) : volume;
					_json.volume = volume = Math.min(1, Math.max(0, parseFloat(_json.volume)));
					player.volume = parseFloat(volume);
					t = volume * 100;
					$("#volume").attr({
						style: '--background-range: ' + t + '%'
					})
					//$('html').attr({
					//	style: '--background-range: ' + t + '%'
					//});
					clearTimeout(aniInterval);
					$('p.left').addClass('visible').text(t + '%');
					aniInterval = setTimeout(function(){
						clearTimeout(aniInterval);
						$('p.left').removeClass('visible')
					}, 3000);
					$("#volume").val(t);
					for (let prop in json.stations) {
						let st = json.stations[prop];
						st.id = prop;
						await addListItem(st);
					}

				} catch(e){
					//
				} finally {
					setTimeout(function(){
						$("main").removeClass('loading');
						setTimeout(scrollTo, 50);
					}, 150);
				}
				return _json;
			},
			writeFile = function(isRead){
				return new Promise(function(resolve, reject){
					isRead = typeof isRead === 'boolean' ? isRead : false;
					var file = dirFile,
						_output = "{}";
					json.stations = {};
					json.active = $('#radio-list li.active').lengt ? active : 0;
					json.notify = notify;
					json.volume = Math.min(1, Math.max(0, parseFloat($("#volume").val() / 100)));
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
						if(!err){
							isRead && readFile();
							resolve('write');
						}else{
							quitError(locale.appError);
							reject(err);
						}
					});
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
					tmpCrop.bind({
						url: icon,
						backgroundColor: '#ffffff'
					}).then(function(){
						tmpCrop.result({
							type: 'base64',
							size: 'viewport',
							format: 'jpeg',
							backgroundColor: '#ffffff'
						}).then(function(base64){
							navigator.mediaSession.metadata = new MediaMetadata({
								title: locale.appName,
								artist: title,
								album: "",
								artwork: [{src: base64, type: "image/png", sizes: '128x128'}]
							});
						});
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
			init = function(type){
				$('#radio-list').empty();
				if(fs.existsSync(dir)) {
					if(type == false){
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
					}else if(type == true){
						fs.rmdir(dir, {recursive: true}, (err) => {
							if(!err){
								fse.copy('radio', dir)
								.then(() => {
									init(!type);
								})
								.catch(err => {
									quitError(locale.appError);
								});
							}else{
								console.log(err);
							}
						});
					}
				}else{
					fs.mkdir(dir, 0777, (error) => {
						fse.copy('radio', dir)
						.then(() => {
							init(!type);
						})
						.catch(err => {
							quitError(locale.appError);
						});
					});
				}
			};
	var active = json.active,
		notify = json.notify,
		aniInterval = 0;
	/**
	 * Checking the directory and file
	 **/
	
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
						//console.log(args);
						$("main").addClass('loading');
						if(args.type == 'insert'){
							writeFile(false).then(function(){
								addListItem(args);
								$("main").removeClass('loading');
							}).catch(function(){
								alert('Попробуйте ещё раз');
								$("main").removeClass('loading');
							});
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
					//console.log("Экспорт станций");
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

	/**
	 * Player events
	 **/
	player.addEventListener('statechange', function(e){
		//console.log(e)
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
	 * Adding a close event to nwWindow
	 **/
	win.on('close',function(){
		$("main").addClass('loading');
		writeFile(false).then(function(){
			setTimeout(nw.App.quit, 200);
			return !1;
		}).catch(function(){
			setTimeout(nw.App.quit, 200);
			return !1;
		});
	});
	/**
	 * Set App title
	 **/
	setTitle(locale.appName);
	/**
	 * Run App Radio
	 **/
	setTimeout(()=>{
		init(false);
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
						$("main").addClass('loading');
						writeFile(false).then(function(){
							$("main").removeClass('loading');
						}).catch(function(){
							alert('Попробуйте ещё раз');
							$("main").addClass('loading');
						});
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
			 * Context menu main, footer
			 **/
			e.preventDefault();
			let ev = e.originalEvent;
			menu.popup(parseInt(ev.x), parseInt(ev.y));
			return !1;
		}).on('contextmenu', 'html', function(e){
			/**
			 * Context menu default
			 **/
			e.preventDefault();
			e.stopPropagation();
			return !1;
		}).on('mousewheel', '#volume', function(e){
			/**
			 * mousewhell Volume range
			 **/
			let o = e.originalEvent.wheelDelta;
			this.value = parseFloat(this.value) + ((o > 0) ? 1 : -1);
			this.dispatchEvent(new Event('input'));
		}).on('input change', 'input[type=range]', function(e){
			e.preventDefault();
			let min = parseFloat(this.min),
				max = parseFloat(this.max),
				val = parseFloat(this.value),
				mi = 0,
				ma = max - min,
				v = val - min,
				s = (v * 100) / ma;
			//console.log(max - min, val - min, val)
				//delta = max - min,
				//s = ((delta - val - min) * 100) / delta;
			//console.log(s);
			$(this).attr({
				style: '--background-range: ' +  s + '%'
			});
		}).trigger('change');
		/**
		 * Volume range
		 **/
		$('input[type=range]').on('input change')
		$("#volume").on('input change', function(e){
			//e.preventDefault();
			let s = parseFloat(this.value / 100),
				t = this.value + '%';
			player.volume = s;
			//$('html').attr({
			//	style: '--background-range: ' + t
			//});
			clearTimeout(aniInterval);
			$('p.left').addClass('visible').text(t);
			aniInterval = setTimeout(function(){
				clearTimeout(aniInterval);
				$('p.left').removeClass('visible')
			}, 3000);
			//return !1;
		});
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
		$("#settings").on('click', function(e){
			e.preventDefault();
			$settingsBlock.toggleClass('show');
			return !1;
		});
		$okSettings.on('click', function(e){
			e.preventDefault();
			$settingsBlock.removeClass('show');
			notify = $notify.prop('checked');
			if($loadDefault.prop('checked')){
				player.stop();
				deleteRadioPath(dir);
				$("#radio-list").empty();
				active = 0;
				writeFile(true).then(()=> {
					init(true);
					writeFile(false);
				});
			}else if($clear_stations.prop('checked')){
				player.stop();
				deleteRadioPath(dir);
				$("#radio-list").empty();
				active = 0;
				writeFile(true).then(()=> {
					init(false);
				});
			}
			$loadDefault.prop('checked', false);
			$clear_stations.prop('checked', false);
			$notify.prop('checked', notify);
			return !1;
		});
		$noSettings.on('click', function(e){
			e.preventDefault();
			$settingsBlock.removeClass('show');
			$loadDefault.prop('checked', false);
			$clear_stations.prop('checked', false);
			$notify.prop('checked', notify);
			return !1;
		});
	}, 1000);
}(jQuery));