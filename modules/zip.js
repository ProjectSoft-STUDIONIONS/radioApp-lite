module.exports = function(options) {
	const fs = require("fs");
	const path = require("path");
	const colors = require('ansi-colors');
	const { log, logTable, logStation, logError, breakLn } = require('./log.js');
	const { ZipArchive } = require("archiver");

	return new Promise( function(resolve, reject){
		log(colors.yellowBright(`Архивирование ресурсов приложения`), true);
		breakLn();
		try {
			const output = fs.createWriteStream("./build/package.nw");
			const archive = new ZipArchive("zip", {
				zlib: { level: 1 },
			});
			output.on("close", function () {
				log(colors.yellowBright(`Архивирование ресурсов приложения завершено`), true);
				breakLn();
				resolve();
			});
			output.on("end", function () {
				console.log("Data has been drained");
			});
			archive.on("warning", function (err) {
				console.log('archive warning');
				if (err.code === "ENOENT") {
					// log warning
					console.log(
						"archiver Warning.",
					);
					throw err;
					reject(err);
				} else {
					// throw error
					throw err;
					reject(err);
				}
			});
			archive.on("error", function (err) {
				throw err;
				reject(err);
			});
			archive.pipe(output);
			archive.glob("**/*.*", { cwd: __dirname + '/../application' });
			archive.finalize();
		} catch(e) {
			console.log('Error try catch');
			throw e;
			reject(e);
		}
	});
}
