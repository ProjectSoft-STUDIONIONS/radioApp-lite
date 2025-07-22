// --user-data-dir=%APPDATA%\\YourRadio
!(function($){
	// %USERPROFILE%/AppData/Local/YourRadio/User Data/Default/Google Profile.ico
	var elCrop = document.getElementById('cropTmp'),
		tmpCrop = new Croppie(elCrop, {
			viewport: {
				width: 180,
				height: 180,
				type: 'square'
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
		$noSettings = $("#noSettings"),
		parser = null,
		getMetaInterval = 0,
		notifyInterval = 0,
		previosStream = '',
		mixitupVar;
	const regex = /^data:image\/png;base64,iVBORw0KGgo/;

	const addListItem = async function(data){
				try{
					if(data.name && data.stream){
						let _id = data.id,
							_name = data.name,
							_stream = data.stream,
							_genre = data.genre || [],
							has = "?" + (new Date()).getTime(),
							_imageIcon = data.favicon || false,
							_imageBig = data.image || false,
							iconStr = `${dir}\\${_id}`,
							_icon = ((fs.existsSync(`${iconStr}.png`))	? `${iconStr}.png` : false);
						if(!_icon){
							try{
								if(_imageIcon && regex.test(_imageIcon)){
									let strIcon = _imageIcon.split(",")[1],
										buffer1 = Buffer.from(strIcon, "base64");
									_icon = `${iconStr}.png`;
									fs.writeFileSync(_icon, buffer1);
								}
							}catch(e){
								log(`Error _imageIcon ${_id}`, e);
							}
							try{
								if(_imageBig && regex.test(_imageBig)){
									let strImage = _imageBig.split(",")[1],
										buffer2 = Buffer.from(strImage, "base64");
									fs.writeFileSync(`${iconStr}_big.png`, buffer2);
								}
							}catch(e){
								log(`Error _imageBig ${_id}`, e);
							}
						}
						_icon = (!_icon) ? 'image_fav.png' : _icon;
						let classNames = "";
						let genreNames = _genre.map((gn) => {
							let name = translit(gn).toLowerCase();
							return name;
						});
						for(let g_names in genreNames){
							classNames += ` ${genreNames[g_names]}`
						}
						classNames = classNames.length ? classNames : " none";
						let _tmp = $(`<li id="st_${_id}" class="radio-item stop${classNames}">
							<div class="radio-item-box">
								<div class="radio-item-icon">
									<span class="icons"></span>
									<span class="favicon"><img src="${_icon + has}" alt="${_name}"></span>
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
							stream: _stream,
							genre: _genre
						});
						$('#radio-list').append(_tmp);
						if(active == _id){
							_tmp.addClass('active');
						}
						return _tmp;
					}
					return !1;
				}catch(e){
					log(e);
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
				
				clearTimeout(aniInterval);
				$("main").addClass('loading');
				try {
					let t = 0;
					_json = fs.readFileSync(file);
					_json = decoder.write(_json);
					_json = JSON.parse(_json);
					let setters = new Set();
					json.stations = _json["stations"];
					json.active = active = _json["active"] ? parseInt(_json["active"]) : active;
					json.notify = notify = _json["notify"] ? _json["notify"] : notify;
					json.genre = _json.genre || [];
					$notify.prop('checked', notify);
					_json.volume = parseFloat(_json["volume"]) >= 0 ? parseFloat(_json["volume"]) : volume;
					_json.volume = volume = Math.min(1, Math.max(0, parseFloat(_json.volume)));
					player.volume = parseFloat(volume);
					t = volume * 100;
					$("#volume").attr({
						style: '--background-range: ' + t + '%'
					}).val(t);
					$('p.left').removeClass('visible').text(t + '%');

					$('#radio-list').empty();
					for (let prop in json.stations) {
						let st = json.stations[prop];
						st.genre = st.genre || [];
						for (let gn in st.genre) {
							setters.add(st.genre[gn]);
						}
						st.id = parseInt(prop);
						await addListItem(st);
					}
					/**
					 * Genre
					 */
					json.genre = [...setters];
					let arr = [...setters];
					arr.sort();
					$('#genre').empty();
					$('#genre').append($(`<li class="genre_item active" data-filter="all"><span>Все</span></li>`));
					for(let gr in arr){
						let genreName = translit(arr[gr]).toLowerCase();
						$('#genre').append($(`<li class="genre_item" data-filter=".${genreName}"><span>${arr[gr]}</span></li>`));
					}
					//mixitupVar && mixitupVar.destroy();
					//mixitupVar = null;
				} catch(e){
					//
				} finally {
					setTimeout(function(){
						$("main").removeClass('loading');
						setTimeout(scrollTo, 50);
					}, 250);
				}
				return _json;
			},
			writeFile = function(isRead){
				return new Promise(function(resolve, reject){
					isRead = typeof isRead === 'boolean' ? isRead : false;
					let file = dirFile,
						_output = "{}",
						genreSet = new Set();
					json.stations = {};
					json.active = parseInt($("#radio-list li.active").length ? $("#radio-list li.active").data('id') : 0);
					json.notify = notify;
					json.volume = Math.min(1, Math.max(0, parseFloat($("#volume").val() / 100)));

					$('#radio-list li').each(function(){
						let $this = $(this),
							data = $this.data(),
							id = parseInt($this.prop('id').split('_')[1]),
							genre = data.genre || [];
						for(let index in genre) {
							genreSet.add(genre[index]);
						}
						json.stations[id] = {
							name: data.name,
							stream: data.stream,
							genre: genre
						};
					});
					// Жанры
					let arrGenre = [...genreSet];
					arrGenre.sort();
					json.genre = arrGenre;
					if(!isRead) {
						$('#genre').empty();
						$('#genre').append($(`<li class="genre_item active" data-filter="all"><span>Все</span></li>`));
						for(let gr in arrGenre){
							let genreName = translit(arrGenre[gr]).toLowerCase();
							$('#genre').append($(`<li class="genre_item" data-filter=".${genreName}"><span>${arrGenre[gr]}</span></li>`));
						}
						$('#genre li.genre_item.active').trigger('click');
						$('#genre li.genre_item.active').click();
					}
					// Преобразуем
					_output = JSON.stringify(json, null, "\t");
					fs.writeFile(dirFile, _output, 'utf8', (err) => {
						/**
						 * Если ошибок нет читаем файл 
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
				let fav = dir + `\\${id}.png`,
					big = dir + `\\${id}_big.png`;
				fs.existsSync(fav) && fs.unlinkSync(fav);
				fs.existsSync(big) && fs.unlinkSync(big);
				writeFile(false);
			},
			setTitle = function(title) {
				if(typeof title == 'string'){
					title = title.replace(/\s+/g, ' ');
					$('#TitleBar-text > span').text(title);
				}
			},
			updateSessionMetaData = function() {
				let icon;
				if(player.isPlaying() &&  $('li.radio-item.active').length){
					let $li = $('li.radio-item.active'),
						data = $li.data(),
						id = data.id,
						title = data.streamMeta || data.name,
						has = (new Date()).getTime();
					icon = (fs.existsSync(`${dir}\\${id}.png`)	? `${dir}\\${id}.png` : 'image_fav.png'),
					big = (fs.existsSync(`${dir}\\${id}_big.png`)	? `${dir}\\${id}_big.png` : 'image_big.png');
					tmpCrop.bind({
						url: big,
						backgroundColor: '#ffffff'
					}).then(function(){
						tmpCrop.result({
							type: 'base64',
							size: 'viewport',
							format: 'png',
							backgroundColor: '#ffffff'
						}).then(function(base64){
							navigator.mediaSession.metadata = new MediaMetadata({
								title: title,
								artist: data.name + ' | ' + locale.appName,
								album: "",
								artwork: [{src: base64, type: "image/png", sizes: '128x128'}]
							});
						});
					});
				}else{
					icon  = "data:image/png;base64," + fs.readFileSync('image_fav.png').toString('base64');
					navigator.mediaSession.metadata = new MediaMetadata({
						title: locale.appName,
						artist: "",
						album: "",
						artwork: [{src: icon, type: "image/png", sizes: '128x128'}]
					});
				}
			},
			json = {
				stations: {},
				active: 1,
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
								log(err);
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
			},
			updateRange = function(el){
				let min = parseFloat(el.min),
					max = parseFloat(el.max),
					val = parseFloat(el.value),
					mi = 0,
					ma = max - min,
					v = val - min,
					s = (v * 100) / ma;
				$(el).attr({
					style: '--background-range: ' +  s + '%'
				});
			},
			setParser = function(){
				clearTimeout(getMetaInterval);
				var data = $('#radio-list li.active').data();
				icy.get(player.stream, function (res) {
					var _title = data.streamMeta ? (data.streamMeta.length > 5 ? data.streamMeta : data.name) : data.name,
						// Icon 180x180
						icon = (fs.existsSync(`${dir}\\${data.id}.png`) ? `${dir}\\${data.id}.png` : 'image_fav.png');
					// Big icon 360x180
					icon = (fs.existsSync(`${dir}\\${data.id}_big.png`) ? `${dir}\\${data.id}_big.png` : 'image_big.png');
					if(player.isPlaying()){
						$(`#radio-list li#st_${data.id}`).data('streamMeta', _title);
					}else{
						setTitle(locale.appName);
					}
					res.on('metadata', function (metadata) {
						let parsed = icy.parse(metadata),
							$_title = $.trim(parsed.StreamTitle) + '';
						if($_title.length > 5){
							if(player.isPlaying()){
								if($_title != previosStream){
									// Отправить сообщение для отображения
									if(data.id == $('#radio-list li.active').data('id')){
										previosStream = $_title;
										$(`#radio-list li#st_${data.id}`).data('streamMeta', $_title);
										setTitle($_title + ' | ' + data.name + ' | ' + locale.appName);
										spawnNotification(locale.appName, icon, previosStream + "\n" + data.name);
									}
								}
								getMetaInterval = setTimeout(setParser, 5000);
							}else{
								previosStream = '';
								setTitle(locale.appName);
								$('#radio-list li').each(function(){$(this).data('streamMeta', '')});
							}
						}else{
							if(player.isPlaying()){
								setTitle(data.name + ' | ' + locale.appName);
								getMetaInterval = setTimeout(setParser, 5000);
							}else{
								setTitle(locale.appName);
							}
							$('#radio-list li').each(function(){$(this).data('streamMeta', '')});
						}
						updateSessionMetaData();
					}).on('error', function(err){
						$('#radio-list li').each(function(){$(this).data('streamMeta', '')});
						player.isPlaying() ? (
							getMetaInterval = setTimeout(setParser, 2000),
							setTitle(data.name + ' | ' + locale.appName)
						) : (
							setTitle.text(locale.appName)
						);
					});
				});
			},
			// Вывод оповещения браузера
			spawnNotification = function(body, icon, title) {
				var options = {
					body: body,
					icon: icon
				};
				spawnNotificationClose();
				var opt = {
					type: "image",
					title: body,
					message: title,
					iconUrl: 'favicon.png',
					imageUrl: icon
				};
				notify && chrome.notifications.create('your-radio-webkit', opt, function(){});
			},
			spawnNotificationClose = function() {
				notify && chrome.notifications.clear(
					'your-radio-webkit'
				);
			},
			onMetaData = function(metadata){

			};
	var active = json.active,
		notify = json.notify,
		aniInterval = 0;
	/**
	 * Checking the directory and file
	 **/
	chrome.notifications.getPermissionLevel(
		function(e){
			log(e);
		}
	);
	/**
	 * Context Menu Constants 
	 **/
	const	copyStationItem = new nw.MenuItem({
				label: '   ' + locale.copyTitle,
				type: 'normal',
				icon: 'images/copy.png'
			}),
			addStationItem = new nw.MenuItem({
				label: '   ' + locale.insertTitle,
				type: 'normal',
				icon: 'images/add.png',
				click: function() {
					$.radioDialog.show({
						type: 'insert'
					}, function(args){
						$("main").addClass('loading');
						if(args.type == 'insert'){
							addListItem(args).then(function(el){
								log('add station and writeFile')
								writeFile(false).then(function(){
									$("main").removeClass('loading');
									log(el);
									if(el){
										scrollToEl(el);
									}
								}).catch(function(){
									alert(locale.appRepeat);
									$("main").removeClass('loading');
								});
							});
						}
					});
				}
			}),
			editStationItem = new nw.MenuItem({
				label: '   ' + locale.editTitle,
				type: 'normal',
				icon: 'images/edit.png'
			}),
			removeStationItem = new nw.MenuItem({
				label: '   ' + locale.deleteTitle,
				type: 'normal',
				icon: 'images/delete.png'
			}),
			separator = nw.MenuItem({
				type: 'separator'
			}),
			exportStations = new nw.MenuItem({
				label: '   ' + locale.exportTitle,
				type: 'normal',
				icon: 'images/export.png',
				click: function() {
					$.radioDialog.show({
						type: 'export'
					}, function(args){
						if(args.type == 'export'){
							/**
							 * Export radio stations
							 **/
							ExportSattions(json).then(function(data){
								let _output = JSON.stringify(data, null, "\t");
								dialog.saveFileDialog('radio-export', '.json', function(sfile){
									$("main").addClass('loading');
									fs.writeFile(sfile, _output, 'utf8', (err) => {
										/**
										 * If there is no error,
										 * then we read the file,
										 * otherwise we close the program 
										 **/
										 $("main").removeClass('loading');
										if(!err){
											//isRead && readFile();

										}else{
											quitError(locale.appError);
										}
									});
								});
							}).catch(function(data){
								log(data);
							});
							
						}
					});
				}
			}),
			importStations = new nw.MenuItem({
				label: '   ' + locale.importTitle,
				type: 'normal',
				icon: 'images/import.png',
				click: function() {
					$.radioDialog.show({
						type: 'import'
					}, function(args){
						if(args.type == 'import'){
							dialog.openFileDialog(['.json'], false, function(result){
								player.stop();
								$("main").addClass('loading');
								ImportStations(result).then(function(data){
									$("#radio-list").empty();
									readFile();
								}).catch(function(data){
									alert(data);
								});
							});
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
	menuLi.append(separator);
	menuLi.append(removeStationItem);
	menuLi.append(separator);
	menuLi.append(exportStations);
	menuLi.append(importStations);

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
	 * Run App Radio
	 **/
	setTimeout(()=>{
		init(false);
		/* set lang */
		$('.settingsTitle').text(locale.settingsTitle);
		$('.settingsEmpty').text(locale.settingsEmpty);
		$('.settingsDefault').text(locale.settingsDefault);
		$('.settingsNotify').text(locale.settingsNotify);
		$('#okSettings').text(locale.ok);
		$('#noSettings').text(locale.cancel);
		$('#testBtn').attr({
			"title": locale.appVizualuzer
		});
		$("a[href]").each(function(){
			let $this = $(this),
				link = $this.attr('href');
			$this.attr({
				title:  `${locale.goToWebsite} ${link}`
			});
		});
		$(document).on('click', '#radio-list span.icons', function(e){
			e.preventDefault();
			/**
			 * play & stop radio
			 **/
			var _li = $(this).closest('li'),
				data = _li.data(),
				$text = $('#TitleBar-text span');
			(_li.hasClass('active')) ? (
				_li.hasClass('play') ? (
					clearTimeout(getMetaInterval),
					$('#radio-list li.active').data('streamMeta', ''),
					_li.removeClass('play preload').addClass('stop'),
					player.stop(),
					$text.text(locale.appName),
					$('#radio-list li').each(function(){$(this).data('streamMeta', '');})
				) : (
					_li.removeClass('stop').addClass('play preload'),
					player.stream = data.stream,
					$('#radio-list li').each(function(){$(this).data('streamMeta', '');}),
					$text.text(`${data.name} | ${locale.appName}`),
					player.play()
				)
			) : (
				$("#radio-list li").removeClass('active preload play').addClass('stop'),
				_li.addClass('active preload play').removeClass('stop'),
				player.stream = data.stream,
				$('#radio-list li').each(function(){$(this).data('streamMeta', '');}),
				$text.text(`${data.name} | ${locale.appName}`),
				player.play()
			);
			json.active = active = parseInt(data.id);
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
			editStationItem.label = '   ' + locale.editTitle + stn;
			removeStationItem.label = '   ' + locale.deleteTitle + stn;
			copyStationItem.label = '   ' + locale.copyTitle + stn;

			if(typeof data.genre != 'object'){
				data.genre = [];
			}
			data.global_genre = [...json.genre];
			/**
			 * copy link stream
			 **/
			copyStationItem.click = function(){
				data.type = 'copy';
				navigator.clipboard.writeText(data.stream).then(() => {
					$.radioDialog.show(data, function(args){});
				}).catch(err => {
					log('Something went wrong', err);
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
						let $li = $(`#st_${args.id}`),
							img = $('img', $li),
							name = $('.station-name', `#st_${args.id}`),
							has = "?" + (new Date()).getTime(),
							_icon = ((fs.existsSync(`${dir}\\${args.id}.png`))	? `${dir}\\${args.id}.png` : 'image_big.png') + has;
						
						name.text(args.name);
						let genreNames = args.genre.map((gn) => {
							let name = translit(gn).toLowerCase();
							return name;
						});
						let globalGenre = json.genre.map((gn) => {
							let name = translit(gn).toLowerCase();
							return name;
						});
						let classNames = genreNames.join(" ");
						let globalNames = globalGenre.join(" ");
						$li.data({
							id: args.id,
							name: args.name,
							stream: args.stream,
							genre: args.genre
						});
						$li.removeClass(globalNames);
						$li.addClass(classNames);
						if($li.hasClass('active') && $li.hasClass('play')){
							/**
							 * stop radio
							 **/
							player.stop();
							player.stream = args.stream,
							player.play()
						}
						img.attr({
							alt: args.name,
							src: _icon
						});
						$("main").addClass('loading');
						writeFile(false).then(function(){
							$("main").removeClass('loading');
						}).catch(function(){
							alert(locale.appRepeat);
							$("main").removeClass('loading');
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
						if($(`#st_${args.id}`).hasClass('active')){
							/**
							 * stop radio
							 **/
							 player.stop();
						}
						$(`#st_${args.id}`).remove();
						deleteItem(args.id);
					}
				});
				removeStationItem.click = null;
			}
			menuLi.popup(parseInt(ev.x), parseInt(ev.y));
			return !1;
		}).on('contextmenu', 'main', function(e){
			/**
			 * Context menu main, footer
			 **/
			e.preventDefault();
			let ev = e.originalEvent;
			menu.popup(parseInt(ev.x), parseInt(ev.y));
			return !1;
		}).on('mousewheel', 'input[type=range]', function(e){
			/**
			 * mousewhell inputs range
			 **/
			let o = e.originalEvent.wheelDelta,
				min = parseFloat(this.min),
				max = parseFloat(this.max),
				val = parseFloat(this.value),
				step = parseFloat(this.step);
			this.value = Math.min(max, Math.max(min, (val + (o > 0 ? step : -step))));
			this.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
		}).on('input change', 'input[type=range]', function(e){
			/**
			 * input or change events inputs range
			 **/
			updateRange(this);
			if($(this).attr('id') == 'volume'){
				let s = parseFloat(this.value / 100),
					t = this.value + '%';
				player.volume = json.volume = s;
				clearTimeout(aniInterval);
				$('.left .writ').addClass('visible').text(t);
				aniInterval = setTimeout(function(){
					writeFile(false);
					clearTimeout(aniInterval);
					$('.left .writ').removeClass('visible')
				}, 3000);
			}
		}).on('change input', 'input[type=checkbox]', function(e){
			/**
			 * input change Events CheckBox
			 **/
			$(this).hasClass('group1') && ($(this).is(':checked') && $('.group1:checkbox').not(this).prop('checked', false));
		}).on('click', "#settings", function(e){
			/**
			 * settings open dialog
			 **/
			e.preventDefault();
			$.radioDialog.close();
			$settingsBlock[0].showModal();
			return !1;
		}).on('click', '.genre_list li', (e) => {
			let targ = e.target;
			let fil = $(targ).data('filter');
			//mixitup-radio-item-active
			$('.genre_list li').removeClass('active');
			$(targ).addClass('active');
			$('#radio-list li').removeClass('hidden');
			if(fil != 'all') {
				$(`#radio-list li`).addClass(`hidden`);
				$(`#radio-list li${fil}`).removeClass(`hidden`);
			}
			scrollToEl($(`#radio-list li.active`));
		}).trigger('change');
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
		$('dialog').on('close', function(){
			$.radioDialog.close();
		})
		$okSettings.on('click', function(e){
			/**
			 * Ok settings click
			 **/
			e.preventDefault();
			notify = $notify.prop('checked');
			if($loadDefault.prop('checked')){
				player.stop();
				DeleteRadioPath(dir).then(function(){
					$("#radio-list").empty();
					active = 0;
					writeFile(true).then(()=> {
						init(true);
						writeFile(false);
					});
				});
				
			}else if($clear_stations.prop('checked')){
				player.stop();
				DeleteRadioPath(dir).then(function(){
					$("#radio-list").empty();
					active = 0;
					writeFile(true).then(()=> {
						init(false);
					});
				});
			}
			/**
			 * Close settings
			 **/
			$noSettings.click();
			return !1;
		});
		$noSettings.on('click', function(e){
			/**
			 * Cancel settings click
			 **/
			e.preventDefault();
			$loadDefault.prop('checked', false);
			$clear_stations.prop('checked', false);
			$notify.prop('checked', notify);
			$settingsBlock[0].close();
			return !1;
		});
	}, 1000);

	/**
	 * Set App title
	 **/
	setTitle(locale.appName);

	/**
	 * Player events
	 **/
	player.addEventListener('statechange', function(e){
		if(e.type=='statechange'){
			let $li = $('.radio-item.active');
			switch(e.audioev){
				case 'play':
					$li.removeClass('stop').addClass('play preload');
					clearTimeout(getMetaInterval);
					break;
				case 'playing':
					spawnNotificationClose();
					e.bufering ?  (
						$li.removeClass('stop').addClass('play preload')
					) : (
						$li.removeClass('stop preload').addClass('play')
					);
					setParser();
					break;
				case 'stop':
					clearTimeout(getMetaInterval);
					$li.addClass('stop').removeClass('play preload');
					$('#TitleBar-text span').text(locale.appName);
					$('#radio-list li').each(function(){$(this).data('streamMeta', '');});
					previosStream = '';
					break;
			}
			updateSessionMetaData();
		}
	});

	/**
	 * Type range croppie
	 * Обновление данных для оформления ползунка
	 * Без этого просто никак.
	 * Лучше всего слушать событие от document
	 */
	$(document).on('update.croppie', '.cropie', function(e) {
		$('input[type=range]', e.target).trigger('change');
	});
}(jQuery));