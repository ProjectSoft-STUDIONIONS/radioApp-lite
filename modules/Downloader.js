module.exports = function(grunt) {
	const fs = require("fs");
	const cliProgress = require('cli-progress');
	const _colors = require('ansi-colors');
	async function fileExists(filePath) {
		let exists = true;
		try {
			await fs.promises.stat(filePath);
		} catch {
			exists = false;
		}
		return exists;
	}

	function getManifest(){
		return new Promise(async function(resolve, reject){
			let cah = await fileExists(".cache/");
			if(cah){
				fs.rmSync(".cache/", {recursive: true, force: true});
				fs.mkdirSync(".cache/", {recursive: true});
			}
			const { DownloaderHelper } = require('node-downloader-helper');
			const progress = new cliProgress.SingleBar({
				format: '    ' + _colors.cyan('{bar}') + ' {percentage}% | ETA: {eta}s | {value}/{total}',
			}, cliProgress.Presets.shades_grey);
			progress.start(100, 0);
			const dl = new DownloaderHelper('https://nwjs.io/versions.json', ".cache/", {
				fileName: 'manifest.json'
            });
			dl.on('end', function() {
				progress.stop();
				console.log('Download versions manifest Completed');
				resolve();
			});
			dl.on('error', function(err){
				progress.stop();
				console.log('Download Failed', err);
				reject(err);
			});
			dl.on('progress', function(data){
				progress.update(parseInt(data.progress));
			});
			dl.start().catch(function(err) {
				progress.stop();
				reject(err);
			});
		});
		
	}
	function getFlavor(version = "", sdk = false) {
		return new Promise(async function(resolve, reject){
			const file = fs.readFileSync(".cache/manifest.json", {encoding: 'utf8'}),
				flv = sdk ? '-sdk' : '';
			try {
				let obj = JSON.parse(file),
					path = version ? `v${version}` : obj.latest,
					url = `https://dl.nwjs.io/${path}/nwjs${flv}-${path}-win-ia32.zip`;
				const { DownloaderHelper } = require('node-downloader-helper');
				const progress = new cliProgress.SingleBar({
					format: '    ' + _colors.cyan('{bar}') + ' {percentage}% | ETA: {eta}s | {value}/{total}',
				}, cliProgress.Presets.shades_grey);
				progress.start(100, 0);
				const dl = new DownloaderHelper(url, ".cache/", {
					fileName: `${path}.zip`
				});
				dl.on('end', function() {
					progress.stop();
					console.log(`Download versions ${path} Completed`);
					// UNZIPED
					resolve();
				});
				dl.on('error', function(err){
					progress.stop();
					console.log('Download Failed', err);
					reject(err);
				});
				dl.on('progress', function(data){
					progress.update(parseInt(data.progress));
				});
				dl.start().catch(function(err) {
					reject(err);
				});
			}catch(e){
				reject(e);
			}
		});
	}
	function getFFMPEG(version = "", sdk = false) {
		return new Promise(async function(resolve, reject){
		});
	}
	grunt.registerMultiTask('downloader', 'Download NW.JS', async function() {
		var done = this.async();
		getManifest().then(async function(){
			getFlavor().then(async function(){
				done();
			}).catch(function(error){
				done("Error");
			});
		}).catch(function(error){
			done("Error");
		})
	});

}

//https://nwjs.io/versions.json