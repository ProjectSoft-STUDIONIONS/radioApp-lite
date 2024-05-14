module.exports = function(grunt) {
	const fs = require("fs");
	const path = require("path");
	
	

	grunt.registerMultiTask('version_edit', 'Version Update YourRadio Lite', async function() {
		var done = this.async();
		const version = this.options().pkg.version;
		grunt.file.write("version.iss", `#define RadioAppVersion "${version}"`);
		let versApp = grunt.file.readJSON('application/package.json');
		versApp.version = version;
		versApp.buildDate = grunt.template.date(new Date().getTime(), 'dd mmmm yyyy HH:ss:MM');
		let str = JSON.stringify(versApp, null, "\t");
		grunt.file.write("application/package.json", `${str}`);
		done();
	});
};