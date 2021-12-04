!(function($, doc){
	var defaults = {
			type: 'insert'
		},
		_tpl = `<div class="modal clearfix">
			<span class="icon-close close"></span>
			<div class="modal-dialog">
				<div class="modal-wrapper">
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
					<div class="modal-buttons">
						<button class="control btn ok" type="button">${locale.ok}</button>
						<button class="control btn cancel" type="button">${locale.cancel}</button>
					</div>
				</div>
			</div>
		</div>`,
		_tplCopy = `<div class="modal clearfix">
			<span class="icon-close close"></span>
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
		_tplDelete = `<div class="modal clearfix">
			<span class="icon-close close"></span>
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
		_tplExpImp = `<div class="modal clearfix">
			<span class="icon-close close"></span>
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
		btns = null,
		keyIndex = 0,
		id = (new Date()).getTime(),
		Modal = function(options){
			var settings = $.extend( true, {}, defaults, options),
				tpl = null,
				$this = this,
				type = settings.type,
				title = '',
				localeMessage = '';
			$this.modal = null;
			$this.name = "";
			$this.stream = "";
			$this.id = 0;
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
					tpl = $(_tplExpImp).clone();
					title = locale.exportTitle;
					message = localeMessage;
					$('.modal-inputs p', tpl).text(message);
					break;
				case 'import':
					localeMessage = locale.importMessage;
					tpl = $(_tplExpImp).clone();
					title = locale.importTitle;
					message = localeMessage;
					$('.modal-inputs p', tpl).text(message);
					break;
				case 'delete':
					let deleteText = locale.deleteStation;
					tpl = $(_tplDelete).clone();
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
			$this.selector = '.appBlock';
			$this.type = type;
			$this.modal = tpl;
			btns = $('.btn, input', $this.modal);
			$('h2', $this.modal).text(title);
			$($this.selector).append($this.modal).removeClass('hidden');
			$(doc).on('keydown.radioDialog', $this.keydown.bind($this));
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
			var name = this.name,
				stream = this.stream,
				type = this.type,
				id = this.id;
			if(this.modal){
				switch (type) {
					case 'edit':
						id = this.id;
						name = $.trim($('input.name', this.modal).val());
						stream = $.trim($('input.stream', this.modal).val());
						if(!name || !stream){
							$('input.name', this.modal).focus();
							return !1;
						}
						break;
					case 'delete':
						id = this.id;
						break;
					case 'insert':
						id = (new Date()).getTime();
						name = $.trim($('input.name', this.modal).val());
						stream = $.trim($('input.stream', this.modal).val());
						if(!name || !stream){
							$('input.name', this.modal).focus();
							return !1;
						}
						break;
					default:
						break;
				}
				return {
					name: name,
					stream: stream,
					id: id,
					type: type
				};
			}
			return false;
		},
		keydown: function(e){
			if(e.keyCode == 9){
				e.preventDefault();
				if(btns.length) {
					if(keyIndex > btns.length-1){
						keyIndex = 0;
					}
					btns[keyIndex].focus();
					++keyIndex;
				}
				return !1;
			}
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
					let _ok = self._.ok();
					if(_ok){
						callback(_ok);
						$('.close, .cancel, .ok', self._.selector).unbind('click.radioDialog');
						self.close();
						delete self._;
					}
					return !1;
				});
			}
			return self;
		},
		close: function(){
			var self = this;
			$(self._.selector).addClass('hidden');
			$(doc).unbind('keydown.radioDialog');
			self._.close();
			btns = null;
			return self;
		}
	}
	function getImage(){

	}
}(jQuery, document));