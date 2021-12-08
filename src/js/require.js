
if(nw.process.versions["nw-flavor"] == "sdk"){
	nw.Window.get().showDevTools();
}
const gui = require('nw.gui'),
	fs = require('fs'),
	locale = require(".\\modules\\locale.js"),
	AudioPlayer = require(".\\modules\\audioplayer.js"),
	dialog = require(".\\modules\\nwdialog.js"),
	{ StringDecoder } = require('string_decoder'),
	decoder = new StringDecoder('utf8'),
	win = nw.Window.get(),
	dir = nw.App.dataPath + "\\radio",
	dirFile = dir + "\\data.json",
	quitError = function(error){
		alert(error);
		win.close();
	},
	scrollTo = function(){
		let $el = $('#radio-list > li.active');
		if($el.length){
			let offsetWrap = $('main > .container > .row').offset(),
				heightWrap = $('main > .container > .row').height(),
				offsetEl = $el.offset(),
				topEl = (offsetEl.top - offsetWrap.top) >= 0,
				bottomEl = (heightWrap - $el.height()) >= (offsetEl.top - offsetWrap.top);
			if(!topEl){
				$el[0].scrollIntoView(true);
			}else if(!bottomEl){
				$el[0].scrollIntoView(false);
			}
		}
	},
	player = new AudioPlayer(document);