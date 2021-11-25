
!(function($){
	const 	readFile = function(file){
				$("main").addClass('loading');
				console.log(`Read file`);
				setTimeout(function(){
					$("main").removeClass('loading');
				}, 2000);
			},
			writeFile = function(file){
				console.log(`Write file`);
			},
			setTitle = function(title) {
				title = title.replace(/\s+/g, ' ');
				$('#TitleBar-text > span').text(title);
				win.title = title;
			},
			dir = nw.App.dataPath + "/radio",
			dirFile = dir + "/data.json";
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
									quitError(locale.appError);
								}
							});
						}else{
							// С аттрибутами чо-то не то.
							// Пробуем установить
							fs.chmod(dirFile, 0777, (err3) => {
								if (err3){
									// Закрываем программу
									quitError(locale.appError);
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
				quitError(locale.appError);
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
					quitError(locale.appError);
				}
			});
		}
	});
	setTitle(locale.appName);
	var testTime = 0;
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
		
		

		testTime = setTimeout(function(){
			/*** TEST ***/
			/**
			 * setTimeout удалить 
			**/
			clearTimeout(testTime);
			_li.removeClass('preload');
		}, 3000);
		return !1;
	})
}(jQuery));