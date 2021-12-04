
if(nw.process.versions["nw-flavor"] == "sdk"){
	nw.Window.get().showDevTools();
}
const gui = require('nw.gui'),
	fs = require('fs'),
	locale = require(".\\modules\\locale.js"),
	AudioPlayer = require(".\\modules\\audioplayer.js"),
	{ StringDecoder } = require('string_decoder'),
	decoder = new StringDecoder('utf8'),
	win = nw.Window.get(),
	dir = nw.App.dataPath + "\\radio",
	dirFile = dir + "\\data.json",
	quitError = function(error){
		alert(error);
		win.close();
	};