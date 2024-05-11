module.exports = function(grunt) {
	const fs = require("fs");
	const cliProgress = require('cli-progress');
	const _colors = require('ansi-colors');
	var options = {
			version: '0.86.0',
			sdk: false
		},
		versions = '0.86.0';
	const formatTime = function(value){

			// leading zero padding
			function autopadding(v){
				return ("0" + v).slice(-2);
			}
			var s = autopadding(Math.round(value % 60));
			var m = autopadding(Math.round((value / 60) % 60));
			var h  = autopadding(Math.round((value / 360) % 24));
			return h + ":" + m + ":" + s
		},
		autopaddingVal = function (value, length, opt){
			return (opt.autopaddingChar + value).slice(-length);
		},
		formatBytes = function(bytes, decimals = 2) {
			if (bytes === 0) return '0 Bt';
			const k = 1024;
			const dm = decimals < 0 ? 0 : decimals;
			const sizes = ['Bt', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat(bytes / Math.pow(k, i)).toFixed(dm) + ' ' + sizes[i];
		},
		formatBar = function(optionsBar, paramsBar, payloadBar){
			function autopadding(value, length){
				return (optionsBar.autopaddingChar + value).slice(-length);
			}
			const completeSize = Math.round(paramsBar.progress * optionsBar.barsize);
			const incompleteSize = optionsBar.barsize - completeSize;
			const bar = optionsBar.barCompleteString.substr(0, completeSize) +
					optionsBar.barGlue +
					optionsBar.barIncompleteString.substr(0, incompleteSize);
			const percentage =  Math.floor(paramsBar.progress * 100) + '';
			const formatValue = formatBytes(paramsBar.value);
			const formatTotal = formatBytes(paramsBar.total);
			const total = formatTotal.length;// params
			const stopTime = paramsBar.stopTime || Date.now();
			const elapsedTime = formatTime(Math.round((stopTime - paramsBar.startTime)/1000));
			
			var barStr = _colors.white('|') + _colors.cyan(bar + ' ' + autopadding(percentage, 3) + '%') + "  " + _colors.white('|') + "  " + elapsedTime;
			return barStr;
		};
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
				stopOnComplete: true,
				hideCursor: false,
				autopadding: true,
				barsize: 50
			},{
				format: formatBar,
				barCompleteChar: '\u2588',
				barIncompleteChar: '\u2592'
			});
			console.log('Download MANIFEST');
			progress.start(100, 0);
			const dl = new DownloaderHelper('https://nwjs.io/versions.json', ".cache/", {
				fileName: 'manifest.json'
            });
			dl.on('response', function(res){
				console.log('response');
			});
			dl.on('end', function() {
				progress.stop();
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
	function getFlavor() {
		return new Promise(async function(resolve, reject){
			const file = fs.readFileSync(".cache/manifest.json", {encoding: 'utf8'}),
				flv = options.sdk ? '-sdk' : '';
			try {
				let obj = JSON.parse(file),
					path = options.version ? `v${options.version}` : obj.stable;
				versions = path.slice(1);
				let url = `https://dl.nwjs.io/${path}/nwjs${flv}-${path}-win-ia32.zip`;
				const { DownloaderHelper } = require('node-downloader-helper');
				const progress = new cliProgress.SingleBar({
					stopOnComplete: true,
					hideCursor: false,
					autopadding: true,
					barsize: 50
				},{
					format: formatBar,
					barCompleteChar: '\u2588',
					barIncompleteChar: '\u2592'
				});
				console.log(`Download NWJS nwjs${flv}-${path}-win-ia32.zip`);
				progress.start(100, 0);
				const dl = new DownloaderHelper(url, ".cache/", {
					fileName: `${path}.zip`
				});
				dl.on('response', function(res){
					console.log('response');
				});
				dl.on('end', function() {
					progress.stop();
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
	function getFFMPEG() {
		// 0.87.0-win-ia32.zip
		return new Promise(async function(resolve, reject){
			const url = `https://github.com/nwjs-ffmpeg-prebuilt/nwjs-ffmpeg-prebuilt/releases/download/${versions}/${versions}-win-ia32.zip`;
			const out = `ffmpeg.zip`;
			console.log(url);
			const { DownloaderHelper } = require('node-downloader-helper');
			const progress = new cliProgress.SingleBar({
				stopOnComplete: true,
				hideCursor: false,
				autopadding: true,
				barsize: 50
			},{
				format: formatBar,
				barCompleteChar: '\u2588',
				barIncompleteChar: '\u2592'
			});
			console.log(`Download FFMPEG ${versions}`);
			progress.start(100, 0);
			const dl = new DownloaderHelper(url, ".cache/", {
				fileName: out
			});
			dl.on('response', function(res){
				console.log('response');
			});
			dl.on('end', function() {
				progress.stop();
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
		});
	}
	grunt.registerMultiTask('downloader', 'Download NW.JS', async function() {
		var done = this.async();
		options = this.options();
		getManifest().then(async function(){
			getFlavor().then(async function(){
				getFFMPEG().then(async function(){
					done();
				}).catch(function(error){
					done("Error FFMPEG");
				});
			}).catch(function(error){
				done("Error NMJS");
			});
		}).catch(function(error){
			done("Error MANIFEST");
		})
	});

}

//https://nwjs.io/versions.json