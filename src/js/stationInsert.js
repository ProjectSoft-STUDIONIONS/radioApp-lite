!(function($, doc){
	dialog.context = doc;
	var defaults = {
			type: 'insert'
		},
		imageIcon = 'favicon.png',
		_tpl = `<div class="modal clearfix">
			<div class="modal-dialog">
				<div class="modal-wrapper">
					<div class="cropie_big"></div>
					<h2 class="modal-title text-center"></h2>
					<div class="modal-inputs row">
						<label class="modal-label container">
							<input class="control name" type="text" value="" placeholder="${locale.insertName}">
							<span>${locale.insertName}</span>
						</label>
						<label class="modal-label container">
							<input class="control stream" type="text" value="" placeholder="${locale.inserStream}">
							<span>${locale.inserStream}</span>
						</label>
					</div>
					<div class="modal-crop">
						<div class="cropie"></div>
						<div class="modal-fileicon">
							<div class="fileicon icon-add-photo" title="${locale.addIcon}"></div>
						</div>
					</div>
					<div class="modal-buttons">
						<button class="control ok" type="button">${locale.ok}</button>
						<button class="control cancel" type="button">${locale.cancel}</button>
					</div>
				</div>
			</div>
		</div>`,
		_tplCopy = `<div class="modal clearfix">
			<div class="modal-dialog">
				<div class="modal-wrapper">
					<h2 class="modal-title text-center"></h2>
					<div class="modal-inputs row">
						<p class="container"></p>
					</div>
					<div class="modal-buttons">
						<button class="control btn ok" type="button">${locale.ok}</button>
					</div>
				</div>
			</div>
		</div>`,
		_tplDelExpImp = `<div class="modal clearfix">
			<div class="modal-dialog">
				<div class="modal-wrapper">
					<h2 class="modal-title text-center"></h2>
					<div class="modal-inputs row">
						<p class="container"></p>
					</div>
					<div class="modal-buttons">
						<button class="control btn ok" type="button">${locale.ok}</button>
						<button class="control btn cancel" type="button">${locale.cancel}</button>
					</div>
				</div>
			</div>
		</div>`,
		blobToBuffer = function(blob) {
			return new Promise(function(resolve, reject){
				if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
					reject('first argument must be a Blob');
				}
				var reader = new FileReader();
				function onLoadEnd (e) {
					reader.removeEventListener('loadend', onLoadEnd, false);
					if (e.error) reject(e.error);
					else resolve(Buffer.from(reader.result));
				}
				reader.addEventListener('loadend', onLoadEnd, false);
				reader.readAsArrayBuffer(blob);
			});
		},
		btns = null,
		keyIndex = 0,
		id = (new Date()).getTime(),
		Modal = function(options){
			var settings = $.extend( true, {}, defaults, options),
				tpl = null,
				$crp = null,
				$bigCrp = null,
				$fav = null,
				icon = null,
				$this = this,
				type = settings.type,
				title = '',
				localeMessage = '';
			$this.modal = null;
			$this.name = "";
			$this.stream = "";
			$this.id = 0;
			$this.selector = '.appBlock';
			switch (type) {
				case 'copy':
					localeMessage = locale.copyOk;
					tpl = $(_tplCopy).clone();
					title = locale.copyTitle;
					message = localeMessage.replace(/%name%/g, " «" + settings.name + "»");
					$('.modal-inputs p', tpl).text(message);
					break;
				case 'export':
					localeMessage = locale.exportMessage;
					tpl = $(_tplDelExpImp).clone();
					title = locale.exportTitle;
					message = localeMessage;
					$('.modal-inputs p', tpl).text(message);
					break;
				case 'import':
					localeMessage = locale.importMessage;
					tpl = $(_tplDelExpImp).clone();
					title = locale.importTitle;
					message = localeMessage;
					$('.modal-inputs p', tpl).text(message);
					break;
				case 'delete':
					let deleteText = locale.deleteStation;
					tpl = $(_tplDelExpImp).clone();
					title = locale.deleteTitle;
					$this.id = settings.id;
					$this.name = settings.name;
					$this.stream = settings.stream;
					message = deleteText.replace(/%name%/g, " «" + settings.name + "»");
					$('.modal-inputs p', tpl).text(message);
					break;
				case 'edit':
					tpl = $(_tpl).clone();
					title = locale.editTitle;
					$this.id = settings.id;
					$this.name = settings.name;
					$this.stream = settings.stream;
					$('input.name', tpl).val($this.name);
					$('input.stream', tpl).val($this.stream);
					break;
				default:
					type = 'insert';
					tpl = $(_tpl).clone();
					title = locale.insertTitle;
					$this.id = (new Date()).getTime();
					break;
			}
			if(type=='insert' || type=='edit'){
				$crp = $(".cropie", tpl);
				$bigCrp = $('.cropie_big', tpl);
				$fav = $(".fileicon", tpl);
				icon = dir + `\\${$this.id}.png`;
				imageIcon = dir + `\\${$this.id}_big.png`;
				icon = (fs.existsSync(imageIcon) ? imageIcon : (fs.existsSync(icon) ? icon : 'favicon.png')) + "?" + (new Date()).getTime();
				$crp.croppie({
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
					mouseWheelZoom: true,
					enableExif: true
				}).croppie('bind', {
					url: icon
				});
				$bigCrp.croppie({
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
					
				}).croppie('bind', {
					url: icon
				});
				$fav.on('click', function(ev){
					ev.preventDefault();
					dialog.openFileDialog(['.jpeg', '.jpg', '.png'], function(result){
						if(!result)
							return;
						result = "file:///" + result.split('\\').join('/');
						$crp.croppie('bind', {
							url: result
						});
						$bigCrp.croppie('bind', {
							url: result
						});
					});
					return !1;
				});
			}
			$this.type = type;
			$this.modal = tpl;
			btns = $('.btn, input', $this.modal);
			$('h2', $this.modal).text(title);
			$($this.selector).append($this.modal)[0].showModal();
			$(btns[0]).focus();
			keyIndex = 1;
			return $this;
		};
	$.extend(Modal.prototype, {
		// functions
		close: function(){
			if(this.modal){
				$('button, input, .close', this.modal).unbind('click.radioDialog');
				this.modal.empty();
				this.modal.remove();
				this.modal = null;
				delete this.selector;
				delete this.modal;
				delete this.type;
				delete this.id;
				delete this.name;
				delete this.stream;
			}
			return this;
		},
		ok: function(){
			var self = this;
			return new Promise(function(resolve, reject) {
				var name = self.name,
					stream = self.stream,
					type = self.type,
					id = self.id,
					$crp = null,
					$bigCrp = null,
					si = null;
				if(typeof self.modal == 'object'){
					switch (type) {
						case 'insert':
						case 'edit':
							//id = type=='edit' ? this.id : (new Date()).getTime();
							name = $.trim($('input.name', self.modal).val());
							stream = $.trim($('input.stream', self.modal).val());
							$crp = $('.cropie', self.modal);
							$bigCrp = $('.cropie_big', self.modal)
							if(!name || !stream){
								$('input.name', self.modal).focus();
								resolve({
									type: 'focus',
									message: 'Name or Stream stations'
								});
							}
							$crp.croppie('result', 'blob').then(function(blob) {
								blobToBuffer(blob).then(function(buffer){
									var path = dir + "/" + id + '.png';
									fs.mkdirSync(dir, {recursive: true});
									fs.writeFileSync(path, buffer);
									$bigCrp.croppie('result', 'blob').then(function(blob1) {
										blobToBuffer(blob1).then(function(buffer1){
											path = dir + "/" + id + '_big.png';
											fs.mkdirSync(dir, {recursive: true});
											fs.writeFileSync(path, buffer1);
											resolve({
												name: name,
												stream: stream,
												id: id,
												si: si,
												type: type
											});
										});
									});
								}).catch(function(err){
									reject({
										type: 'error',
										message: "Station type: " + type + ",\nSaveBlob: " + err
									})
								});
							}).catch(function(err){
								reject({
									type: 'error',
									message: "Station type: " + type + ",\nCroppie:\n " + err
								});
							});

							break;
						case 'delete':
							id = self.id;
							resolve({
								name: name,
								stream: stream,
								id: id,
								si: si,
								type: type
							});
							break;
						default:
							resolve({
								name: name,
								stream: stream,
								id: id,
								si: si,
								type: type
							});
							break;
					}
				}else{
					reject({
						type: 'error',
						message: 'Not modal'
					});
				}
			});
		}
	});


	$.radioDialog = {
		show: function(options, callback){
			var self = this;
			if(!self._) {
				self._ = new Modal(options);
				$('.close, .cancel', self._.selector).on('click.radioDialog', function(e){
					e.preventDefault();
					$('.close, .cancel, .ok', self._.selector).unbind('click.radioDialog');
					callback({type: 'cancel'})
					self.close();
					delete self._;
					return !1;
				});
				$('.ok', self._.selector).on('click.radioDialog', function(e){
					e.preventDefault();
					self._.ok().then(function(data){
						if(data.type == 'error'){
							log('error', data.message);
						}else{
							$('.close, .cancel, .ok', self._.selector).unbind('click.radioDialog');
							self.close();
							callback(data);
							delete self._;
						}
					}).catch(function(data){
						log(data);
					});
					return !1;
				});
			}
			return self;
		},
		close: function(){
			var self = this;
			if(self._){
				$(self._.selector)[0].close();
				self._.close();
				delete self._;
			}
			$("main").removeClass('loading');
			return self;
		}
	}
}(jQuery, document));