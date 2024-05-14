module.exports = function(grunt) {
	const fs = require("fs");
	const path = require("path");
	const rcedit = require("rcedit");

	const resourceEdit = function(){
		return new Promise(async function(resolve, reject){
			const app = grunt.file.readJSON('application/package.json');
			const rcEditOptions = {
				"icon": "application/favicon.ico",
				"file-version": app.version,
				"product-version": app.version,
				"version-string": {
					"Comments": "Ваше Радио. Облегчённая версия.",
					"CompanyName": app.author,
					"FileDescription": "Ваше Радио. Облегчённая версия.",
					"FileVersion": app.version,
					"InternalName": app.name,
					"LegalCopyright": "Copyright ProjectSoft 2008 - all right reserved",
					"LegalTrademarks": app.author,
					"OriginalFilename": app.name,
					"PrivateBuild": app.name,
					"ProductName": app.name,
					"ProductVersion": app.version,
					"SpecialBuild": app.name,
				},
			};
			await rcedit('build/nw.exe', rcEditOptions);
			await fs.renameSync('build/nw.exe', 'build/YourRadio.exe')
			resolve();
		});
	}
	
	grunt.registerMultiTask('buildnw', 'Build NW.JS', async function() {
		var done = this.async();
		options = this.options();
		await resourceEdit();
		done();
	});
};