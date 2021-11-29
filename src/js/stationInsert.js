!(function($){
	var defaults = {
			type: 'insert'
		},
		_tpl = `<div class="modal clearfix">
			<span class="icon-close close"></span>
			<h2 class="modal-title text-center"></h2>
			<div class="modal-inputs">
				<label>
					<input class="control" type="text" value="" placeholder="">
					<span>${locale.insertName}</span>
				</label>
				<label>
					<input class="control" type="text" value="" placeholder="">
					<span>${locale.inserStream}</span>
				</label>
			</div>
			<div class="modal-buttons">
				<button class="control btn" type="button">${locale.ok}</button>
				<button class="control btn" type="button">${locale.cancel}</button>
			</div>
		</div>`,
		_tplExp = `<div class="modal clearfix">
			<h2 class="modal-title text-center"></h2>
		</div>`,
		_tplImp = `<div class="modal clearfix">
			<h2 class="modal-title text-center"></h2>
		</div>`,
		Modal = function(options){
			var settings = $.extend( true, {}, defaults, options),
				tpl = null,
				$this = this,
				btns = null,
				type = settings.type,
				title = '';
			$this.modal = null;
			$this.selector = '.stationInsert';
			$this.firstElement = null;
			$this.lastElement = null;
			$this.stationName = null;
			$this.stationStream = null;
			switch (type) {
				case 'export':
					tpl = $(_tplExp).clone();
					title = locale.exportTitle;
					break;
				case 'import':
					tpl = $(_tplImp).clone();
					title = locale.importTitle;
					break;
				case 'edit':
					tpl = $(_tpl).clone();
					title = locale.editTitle;
					break;
				default:
					tpl = $(_tpl).clone();
					title = locale.insertTitle;
					break;
			}
			$this.modal = tpl;
			if($this.modal){
				btns = $('.btn', $this.modal);
				$this.firstElement = $(btns[0]);
				$this.lastElement = $(btns[btns.length - 1]);
				$('h2', $this.modal).text(title);
				$($this.selector).append($this.modal);
			}
			return $this;
		};
	$.extend(Modal.prototype, {
		// functions
		close: function(){
			console.log('modal close', this)
			var data = {
				stationName: null,
				stationStream: null,
				favicon: null,
				time: 0
			},
			data = $.extend( true, {}, data, this.modal.data());
			if(this.modal){
				$('button, input, .close', this.modal).unbind('click');
				this.modal.empty();
				this.modal.remove();
				this.modal = null;
				delete this.modal;
			}
			return this;
		}
	});
	$.insertStation = {
		/*
		keydown: function(e){
			if(e.keyCode == 9){
				if($.insertStation.modal){
					!e.shiftKey ? $.insertStation.firstElement.focus() : $.insertStation.lastElement.focus();
					return !1;
				}
			}
		},
		*/
		show: function(type){
			var self = this;
			self._ = new Modal(type);
			$(self._.selector).removeClass('hidden');
			$('.close', self._.selector).on('click', function(e){
				e.preventDefault();
				$(this).unbind('click');
				self.close();
				return !1;
			});
			return self;
		},
		close: function(){
			$(this._.selector).addClass('hidden');
			this._.close();

			return this;
		},
		modal: null
	}
}(jQuery));