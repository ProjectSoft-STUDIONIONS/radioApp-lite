
!(function($){
	const 	addListItem = function(data){
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
									<span><img src="${_icon}" alt="${_name}"></span>
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
						addListItem(st);
					}

				} catch(e){}
				finally {
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
					if(!err){
						// Читаем файл
						isRead && readFile();
					}else{
						// Закрываем программу
						quitError(locale.appError);
					}
				});
			},
			setTitle = function(title) {
				title = title.replace(/\s+/g, ' ');
				$('#TitleBar-text > span').text(title);
				win.title = title;
			},
			json = {
				stations: {},
				active: 0,
				notify: false
			};
	var active = json.active,
		notify = json.notify;
	// Проверяем директорию и файл
	fs.mkdir(dir, 0777, (err) => {
		if (err) {
			if (err.code == 'EEXIST'){
				// Существует. Проверяем файл
				fs.access(dirFile, fs.constants.F_OK | fs.constants.W_OK, (err1) => {
					if (err1) {
						// Несуществует
						if(err1.code === 'ENOENT'){
							// Запишем в файл дефолт
							writeFile(true);
						}else{
							// С аттрибутами чо-то не то.
							// Пробуем установить
							fs.chmod(dirFile, 0777, (err3) => {
								if (err3){
									// Закрываем программу
									quitError(locale.appError);
								}else{
									// Читаем файл
									readFile();
								}
							});
						}
					} else {
						// Читаем файл
						readFile();
					}
				});
			} else {
				// Закрываем программу
				quitError(locale.appError);
			}
		} else {
			// Создали и Запишем в файл дефол
			writeFile(true);
		}
	});
	win.on('close',function(){
		writeFile(false);
		nw.App.quit();
	});
	setTitle(locale.appName);
	
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
						if(args.type == 'insert'){
							addListItem(args);
							writeFile(false);
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
						console.log(args);
					});
				}
			}),
			importStations = new nw.MenuItem({
				label: locale.importTitle,
				type: 'normal',
				click: function() {
					console.log("Импорт станций");
					$.radioDialog.show({
						type: 'import'
					}, function(args){
						console.log(args);
					});
				}
			}),
			menu = new nw.Menu(),
			menuLi = new nw.Menu();

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
		// play & stop radio
		var _li = $(this).closest('li');
		(_li.hasClass('active')) ? (
			_li.hasClass('play') ? (
				_li.removeClass('play preload').addClass('stop')
			) : (
			 	_li.removeClass('stop').addClass('play preload')
			 )
		) : (
			$("#radio-list li").removeClass('active preload play').addClass('stop'),
			_li.addClass('active preload play').removeClass('stop')
		);
		json.active = active = _li.prop('id').split('_')[1];
		return !1;
	}).on('click', '.write', function(e){
		e.preventDefault();
		/*
		$.radioDialog.show({
			type: 'insert'
		}, function(args){
			console.log(args);
		});
		*/
		return !1;
	}).on('contextmenu', '#radio-list > li', function(e){
		e.preventDefault();
		var ev = e.originalEvent,
			$ct = $(e.currentTarget),
			data = $ct.data(),
			stn = " - «" + data.name + "»";
		editStationItem.label = locale.editTitle + stn;
		removeStationItem.label = locale.deleteTitle + stn;
		copyStationItem.label = locale.copyTitle + stn;
		// copy link stream
		copyStationItem.click = function(){
			data.type = 'copy';
			navigator.clipboard.writeText(data.stream).then(() => {
				$.radioDialog.show(data, function(args){});
			}).catch(err => {
				console.log('Something went wrong', err);
			});
		};
		// edit station item
		editStationItem.click = function(){
			data.type = 'edit';
			$.radioDialog.show(data, function(args){
				if(args.type == data.type){
					let img = $('img', '#st_' + args.id),
						name = $('.station-name', '#st_' + args.id),
						has = "?" + (new Date()).getTime(),
						_icon = ((fs.existsSync(dir + '\\' + args.id + '.png'))	? dir + '\\' + args.id + '.png' : 'favicon.png') + has;
					if(name.hasClass('active') && name.hasClass('')){
						// stop radio
					}
					img.attr({
						alt: args.name,
						src: _icon
					});
					name.text(args.name);
					$('#st_' + args.id).data({
						id: args.id,
						name: args.name,
						stream: args.stream
					});
					//writeFile(false);
				}
			});
		};
		// remove station item
		removeStationItem.click = function(){
			data.type = 'delete';
			$.radioDialog.show(data, function(args){
				if(args.type == data.type){
					if($('#st_' + args.id).hasClass('active')){
						// stop radio
					}
					$('#st_' + args.id).remove();
				}
			});
		}
		menuLi.popup(parseInt(ev.x), parseInt(ev.y));
		return !1;
	}).on('contextmenu', 'main, footer', function(e){
		e.preventDefault();
		let ev = e.originalEvent;
		menu.popup(parseInt(ev.x), parseInt(ev.y));
		return !1;
	});

	$( "#radio-list" ).sortable({
		axis: "y",
		cursor: "row-resize",
		handle: ".radio-item-handler",
		items: "> li",
		update: function(event, ui){
			writeFile(false);
		}
	});

	//readFile();
}(jQuery));