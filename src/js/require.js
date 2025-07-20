(nw.process.versions["nw-flavor"] == "sdk") &&  nw.Window.get().showDevTools();
const gui = require('nw.gui'),
	fs = require('fs'),
	fse = require('fs-extra'),
	ph = require('path'),
	icy = require('icy'),
	full = (nw.App.argv.indexOf('--full') >= 0),
	win = nw.Window.get(),
	dir = ph.normalize(ph.join(nw.App.dataPath, "radio")),
	dirFile = ph.normalize(ph.join(dir, "data.json")),
	locale = require(ph.normalize(ph.join(".", "modules", "locale.js"))),
	AudioPlayer = require(ph.normalize(ph.join(".", "modules", "audioplayer.js"))),
	dialog = require(ph.normalize(ph.join(".", "modules", "nwdialog.js"))),
	{ translit } = require(ph.normalize(ph.join(".", "modules", "translit.js"))),
	{ StringDecoder } = require('string_decoder'),
	decoder = new StringDecoder('utf8'),
	{ImportStations, ExportSattions, DeleteRadioPath} = require(ph.normalize(ph.join(".", "modules", "impexp.js"))),
	sdk = (nw.process.versions["nw-flavor"] == "sdk"),
	log = function(){
		sdk && console.log.call(arguments);
	},
	quitError = function(error){
		alert(error);
		nw.App.quit();
	},
	scrollTo = function(){
		let $el = $('#radio-list > li.active');
		scrollToEl($el);
	},
	scrollToEl = function($el) {
		if($el.length){
			let offsetWrap = $('main > .container > .row').offset(),
				heightWrap = $('main > .container > .row').height(),
				offsetEl = $el.offset(),
				topEl = (offsetEl.top - offsetWrap.top) >= 0,
				bottomEl = (heightWrap - $el.height()) >= (offsetEl.top - offsetWrap.top);
			log(topEl);
			if(!topEl){
				$el[0].parentElement.scrollTo({
					top: 0,
					left: 0
				});
				$el[0].scrollIntoView(true);
			}else if(!bottomEl){
				$el[0].scrollIntoView(false);
			}
		}
	},
	player = new AudioPlayer(document);
dialog.context = document;
var parser = require(".\\modules\\Parser.js");

fs.writeFileSync(ph.normalize(ph.join(nw.App.dataPath, 'Google Profile.ico')), fs.readFileSync(ph.normalize(ph.join(".", `favicon.ico`))));