module.exports = function(grunt) {

	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);
	var cmd = grunt.option('type'),
		gc = {
			sdk: 'sdk', // sdk, normal
			version: '0.49.0'
		},
		pkg = grunt.file.readJSON('package.json');
	grunt.initConfig({
		globalConfig: gc,
		pkg: pkg,
		clean: {
			options: {
				force: true
			},
			all: [
				'build/',
				'application/css/',
				'application/fonts/',
				'application/js/',
				'application/*-lock.json',
				'application/*.sublime-*',
				'test/'
			],
			dev: [
				'test/',
				'application/*-lock.json'
			]
		},
		webfont: {
			radioapp: {
				src: 'src/glyph/*.svg',
				dest: 'application/fonts',
				options: {
					hashes: false,
					destLess: 'src/less/fonts',
					relativeFontPath: "/fonts/",
					font: 'radioapp',
					types: 'woff2',
					fontFamilyName: 'Radio App',
					stylesheets: ['less'],
					syntax: 'bootstrap',
					execMaxBuffer: 1024 * 400,
					htmlDemo: false,
					version: '1.0.0',
					normalize: true,
					startCodepoint: 0xE900,
					iconsStyles: false,
					autoHint: false,
					templateOptions: {
						baseClass: '',
						classPrefix: 'icon-'
					},
					//embed: ['woff2'],
					template: 'src/radioapp.template'
				}
			}
		},
		ttf2woff2: {
			default: {
				src: ["src/font/*"],
				dest: "application/fonts",
			},
		},
		less: {
			main: {
				options: {
					compress: false,
					ieCompat: false
				},
				files: {
					'test/css/test-main.css': [
						'src/less/main.less',
						'bower_components/Croppie/croppie.css'
					]
				}
			}
		},
		group_css_media_queries: {
			group: {
				files: {
					'test/css/media-main.css': ['test/css/test-main.css']
				}
			}
		},
		cssmin: {
			options: {
				mergeIntoShorthands: false,
				roundingPrecision: -1
			},
			minify: {
				files: {
					'application/css/main.css': ['test/css/media-main.css']
				}
			}
		},
		requirejs: {
			ui: {
				options: {
					baseUrl: __dirname+"/bower_components/jquery-ui/ui/widgets/",//"./",
					paths: {
						jquery: __dirname+'/bower_components/jquery/dist/jquery'
					},
					preserveLicenseComments: false,
					optimize: "uglify",
					findNestedDependencies: true,
					skipModuleInsertion: true,
					exclude: ["jquery"],
					include: [
						"../disable-selection.js",
						"sortable.js",
					],
					out: "test/js/jquery.ui.nogit.js",
					done: function(done, output) {
						grunt.log.writeln(output.magenta);
						grunt.log.writeln("jQueryUI Custom Build ".cyan + "done!\n");
						done();
					},
					error: function(done, err) {
						grunt.log.warn(err);
						done();
					}
				}
			}
		},
		concat: {
			options: {
				separator: ';',
			},
			dist: {
				src: [
					'bower_components/jquery/dist/jquery.js',
					'test/js/jquery.ui.nogit.js',
					'bower_components/jquery.scrollTo/jquery.scrollTo.js',
					'bower_components/Croppie/croppie.js',
				],
				dest: 'test/js/plugins.js',
			},
		},
		uglify : {
			options: {
				ASCIIOnly: true,
				compress: false,
				//beautify: true
			},
			main: {
				files: {
					'application/js/plugins.js': [
						'test/js/plugins.js'
					],
					'application/js/main.js': [
						'src/js/require.js',
						'src/js/windows.js',
						'src/js/stationInsert.js',
						'src/js/main.js'
					],
				},
			},
			modules: {
				files: [
					{
						expand: true,
						cwd: 'src/modules',
						src: ["**//*.js"],
						dest: 'application/modules/'
					},
				],
			},
		},
		pug: {
			files: {
				options: {
					pretty: '',// '\t',
					separator: '',// '\n'
				},
				files: {
					"application/index.html": ['src/pug/index.pug'],
				},
			},
		},
		nwjs: {
			sdk: {
				options: {
					platforms: ['win32'],
					winIco: 'application/favicon.ico',
					buildDir: __dirname+'/build/sdk',
					flavor: 'sdk',
					version: gc.version,
					cacheDir: __dirname+'/.cache',
					zip: true,
					appName: pkg.appName,
					appVersion: pkg.version
				},
				src: [__dirname+'/application/**/*'],
			},
			normal: {
				options: {
					platforms: ['win32'],
					winIco: 'application/favicon.ico',
					buildDir: __dirname+'/build/normal',
					flavor: 'normal',
					version: gc.version,
					cacheDir: __dirname+'/.cache',
					zip: true,
					appName: pkg.appName,
					appVersion: pkg.version
				},
				src: [__dirname+'/application/**/*'],
			},
		},
		ffmpeg_down: {
			start: {
				options: {
					platforms: ["win32"],
					dest: "ffmpeg"
				},
			},
		},
		copy: {
			sdk: {
				files: [
					{
						expand: true,
						cwd: "ffmpeg/win32",
						src: "*.dll",
						dest: "build/sdk/" + pkg.appName + "/win32"
					},
					{
						expand: true,
						cwd: "ffmpeg/win32",
						src: "*.dll",
						dest: ".cache/" + gc.version + "-sdk/win32"
					},
				],
			},
			normal: {
				files: [
					{
						expand: true,
						cwd: "ffmpeg/win32",
						src: "*.dll",
						dest: "build/normal/" + pkg.appName + "/win32"
					},
					{
						expand: true,
						cwd: "ffmpeg/win32",
						src: "*.dll",
						dest: ".cache/" + gc.version + "-normal/win32"
					},
				],
			},
			appcopy: {
				files: [
					{
						expand: true,
						cwd: "src/images",
						src: "**",
						dest: "application/images"
					},
					{
						expand: true,
						cwd: "src/_locales",
						src: "**",
						dest: "application/_locales"
					}
				],
			},
		},
	});
	grunt.registerTask('default', [
		'clean:all',
		'webfont',
		'ttf2woff2',
		'less',
		'group_css_media_queries',
		'cssmin',
		'requirejs',
		'concat',
		'uglify',
		'pug',
		'ffmpeg_down',
		'copy:appcopy',
		'nwjs',
		'copy:sdk',
		'copy:normal'
	]);
	grunt.registerTask('sdk', [
		'clean:dev',
		'less',
		'group_css_media_queries',
		'cssmin',
		'requirejs',
		'concat',
		'uglify',
		'pug',
		'copy:appcopy',
		'nwjs:sdk',
		'copy:sdk'
	]);
	grunt.registerTask('speed', [
		'clean:dev',
		'less',
		'group_css_media_queries',
		'cssmin',
		'requirejs',
		'concat',
		'uglify',
		'pug',
		'copy:appcopy',
		'nwjs',
		'copy:sdk',
		'copy:normal'
	]);
}