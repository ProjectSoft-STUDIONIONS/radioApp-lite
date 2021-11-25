
if(nw.process.versions["nw-flavor"] == "sdk"){
	nw.Window.get().showDevTools();
}
const gui = require('nw.gui'),
	fs = require('fs'),
	locale = require("./modules/locale.js"),
	win = nw.Window.get(),
	quitError = function(error){
		alert(error);
		nw.App.quit();
	};