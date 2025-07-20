module.exports = function(grunt) {
	grunt.registerMultiTask('clear_console', 'Clear console', async function() {
		var done = this.async();
		options = this.options();
		process.stdout.write('\033c');
		done();
	});
}