module.exports = function(grunt) {
	const fs = require("fs");
	const path = require("path");
	const rcedit = require("rcedit");
	const {spawn, execFileSync} = require("child_process");
	function copying() {
		return new Promise(function(resolve, reject){
			const pth = path.resolve(__dirname, "..", "build")
			const ls = spawn('build.cmd', [pth]);
			ls.stdout.on('data', (data) => {
				//console.log(`${data}`);
			});

			ls.stderr.on('data', (data) => {
				reject(`stderr: ${data}`);
			});

			ls.on('close', (code) => {
				resolve();
			});
		});
	}
	function resourceEdit(){
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
					"LegalCopyright": "Copyright 2024",
					"LegalTrademarks": app.author,
					"OriginalFilename": app.name,
					"PrivateBuild": app.name,
					"ProductName": app.name,
					"ProductVersion": app.version,
					"SpecialBuild": app.name,
				},
			};
			await rcedit('build/nw.exe', rcEditOptions);
			resolve();
		});
	}
	grunt.registerMultiTask('buildnw', 'Build NW.JS', async function() {
		var done = this.async();
		options = this.options();
		await resourceEdit();
		await copying();
		done();
	});
};