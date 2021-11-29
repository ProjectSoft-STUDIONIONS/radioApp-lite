
!(function($){
	const 	readFile = async function(){
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
						if(st.name && st.stream){
							let _name = st.name,
								_stream = st.stream,
								_icon = (fs.existsSync(dir + '\\' + prop + '.png'))	? dir + '\\' + prop + '.png' : 'favicon.png';
							let _tmp = $(`<li id="st_${prop}" class="radio-item stop">
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
								id: prop,
								name: _name,
								stream: _stream
							});
							$('#radio-list').append(_tmp);
							if(active == prop){
								_tmp.addClass('active');
							}
						}
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
		writeFile();
		nw.App.quit();
	});
	setTitle(locale.appName);
	
	const	addStationItem = new nw.MenuItem({
				label: "Добавить станцию",
				type: 'normal',
				click: function() {
					console.log("Добавить станцию");
				}
			}),
			removeStationItem = new nw.MenuItem({
				label: "Удалить станцию",
				type: 'normal',
				click: function() {
					console.log("Удалить станцию");
				}
			}),
			separator = nw.MenuItem({
				type: 'separator'
			}),
			exportStations = new nw.MenuItem({
				label: "Экспорт станций",
				type: 'normal',
				click: function() {
					console.log("Экспорт станций");
				}
			}),
			importStations = new nw.MenuItem({
				label: "Импорт станций",
				type: 'normal',
				click: function() {
					console.log("Импорт станций");
				}
			}),
			menu = new nw.Menu(),
			menuLi = new nw.Menu();

	menu.append(addStationItem);
	menu.append(separator);
	menu.append(exportStations);
	menu.append(importStations);
	menuLi.append(addStationItem);
	menuLi.append(removeStationItem);
	menuLi.append(separator);
	menuLi.append(exportStations);
	menuLi.append(importStations);

	$(document).on('click', '#radio-list span.icons', function(e){
		e.preventDefault();
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
		$.insertStation.show('insert');
		return !1;
	}).on('contextmenu', '#radio-list > li', function(e){
		//e.preventDefault();
		//let ev = e.originalEvent;
		//console.log(e);
		//menuLi.popup(parseInt(ev.x), parseInt(ev.y));
		//return !1;
	}).on('contextmenu', 'main, footer', function(e){
		//e.preventDefault();
		//let ev = e.originalEvent;
		//console.log(e);
		//menu.popup(parseInt(ev.x), parseInt(ev.y));
		//return !1;
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