const fs = require('fs'),
	path = require('path'),
	sdk = (nw.process.versions["nw-flavor"] == "sdk"),
	dir = nw.App.dataPath + "\\radio",
	dirFile = dir + "\\data.json",
	{ StringDecoder } = require('string_decoder'),
	decoder = new StringDecoder('utf8'),
	log = function(){
		sdk && console.log.call(arguments);
	};
/**
 * Functions module
 **/
var readFileIcon = async function(id){
	let icon = (fs.existsSync(dir + '\\' + id + '.png')	? dir + '\\' + id + '.png' : 'favicon.png');
	return "data:image/png;base64," + fs.readFileSync(icon).toString('base64');
};
/**
 * Export Stations and Settings
 **/
const DeleteRadioPath = function (directory) {
	return new Promise(function(resolve, reject){
		let files = [];
		if( fs.existsSync(directory) ) {
			files = fs.readdirSync(directory);
			files.forEach(function(file,index, arr){
				let curPath = directory + "/" + file,
					ext = path.extname(curPath).toLowerCase();
				if(!fs.statSync(curPath).isDirectory()) {
					if(ext != '.json'){
						fs.unlinkSync(curPath);
					}
				}
			});
			resolve();
		}else{
			reject();
		}
	});
},
ExportSattions = function(json){
	return new Promise(function(resolve, reject){
		if(typeof json == 'object'){
			json.stations = typeof json.stations == "object" ? json.stations : {};
			json.active = parseInt(json.active) ? parseInt(json.active) : 0;
			json.notify = json.notify ? true : false;
			json.volume = parseFloat(json.volume) ? parseFloat(json.volume) : 0.5;
		}else{
			json = {};
			json.stations = {};
			json.active =  0;
			json.notify = false;
			json.volume = 0.5;
		}
		//json.stations;
		for (let prop in json.stations) {
			json.stations[prop].id = parseInt(prop);
			let icon = (fs.existsSync(dir + '\\' + prop + '.png')	? dir + '\\' + prop + '.png' : 'favicon.png');
			let image = (fs.existsSync(dir + '\\' + prop + '_big.png')	? dir + '\\' + prop + '_big.png' : icon);
			json.stations[prop].favicon = "data:image/png;base64," + fs.readFileSync(icon).toString('base64');
			json.stations[prop].image = "data:image/png;base64," + fs.readFileSync(image).toString('base64');
		}
		resolve(json);
	});
},
/**
 * Import Stations and Settings
 **/
ImportStations = function(file){
	return new Promise(function(resolve, reject){
		const regex = /^data:image\/png;base64,iVBORw0KGgo/;
		if(typeof file == 'string' && fs.existsSync(file)){
			if(path.extname(file.toLowerCase()) == '.json'){
				/**
				 * Read File
				 **/
				try {
					let json = {},
						_json = fs.readFileSync(file);
					_json = decoder.write(_json);
					_json = JSON.parse(_json);
					json.stations = {};
					json.active = _json["active"] ? parseInt(_json["active"]) : 0;
					json.notify = _json["notify"] ? true : false;
					json.volume = _json["volume"] ? parseFloat(_json["volume"]) : 0.5;
					/**
					 * clear Directory
					 **/
					DeleteRadioPath(dir).then(function(){
						/**
						 * read stations
						 **/
						for (let prop in _json["stations"]) {
							let base64 = _json["stations"][prop].favicon,
								image_base64 = _json["stations"][prop].image;
							if(regex.test(base64)){
								json.stations[prop] = {
									id: _json["stations"][prop].id,
									name: _json["stations"][prop].name,
									stream: _json["stations"][prop].stream
								}
								/**
								 * Save Favicon station
								 **/
								fs.writeFileSync(dir + `/${_json["stations"][prop].id}.png`, base64.split('data:image/png;base64,')[1], {encoding: 'base64'});
								if(regex.test(image_base64)){
									fs.writeFileSync(dir + `/${_json["stations"][prop].id}_big.png`, image_base64.split('data:image/png;base64,')[1], {encoding: 'base64'});
								}
							}
						}
						fs.writeFileSync(dirFile, JSON.stringify(json), {encoding: 'utf8'});
						resolve();
					}).catch(function(){
						reject('delete_ErrorReadFile');
					});
				}catch(e){
					reject('read_ErrorReadFile');
				}
			}else{
				reject('extension_ErrorReadFile');
			}
		}else{
			reject('existsfile_ErrorReadFile');
		}
	});
};

if (typeof exports == 'undefined') {
	window.ExportSattions = ExportSattions;
	window.ImportStations = ImportStations;
} else {
	module.exports = {
		ExportSattions: ExportSattions,
		ImportStations: ImportStations,
		DeleteRadioPath: DeleteRadioPath
	};
}