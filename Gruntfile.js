module.exports = function(grunt) {

	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);
	require('./modules/Downloader.js')(grunt);
	const path = require('path');
	var cmd = grunt.option('type'),
		gc = {
			sdk: 'normal', // sdk, normal
			version: '0.87.0' // '0.73.0'
		},
		pkg = grunt.file.readJSON('package.json');
	grunt.initConfig({
		globalConfig: gc,
		pkg: pkg,
		downloader: {
			down: {}
		},
		clean: {
			options: {
				force: true
			},
			all: [
				"*-lock.json",
				'application/css/',
				'application/fonts/',
				'application/js/',
				'application/*-lock.json',
				'application/*.sublime-*',
				'test/'
			],
			dev: [
				"*-lock.json",
				'test/',
				'application/*.sublime-*',
				'application/*-lock.json'
			],
			vk: [
				'build/vk_*',
				'build/vulkan*',
				'build/swiftshader',
			]
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
			build: {
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
					},
					{
						expand: true,
						cwd: `.cache/${gc.version}/${gc.sdk}`,
						src: "**",
						dest: "build/"
					},
					{
						expand: true,
						cwd: "ffmpeg/win32",
						src: "*.dll",
						dest: "build/"
					},
				]
			},
		},
		webfont: {
			radioapp: {
				src: 'src/glyph/*.svg',
				dest: 'src/font',
				options: {
					engine: 'node',
					hashes: false,
					destLess: 'src/less/fonts',
					relativeFontPath: "/fonts/",
					font: 'radioapp',
					types: 'ttf',
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
					ieCompat: false,
					plugins: [
						
					]
				},
				files: {
					'test/css/test-main.css': [
						'src/less/main.less',
						'bower_components/Croppie/croppie.css'
					]
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
					'application/css/main.css': ['test/css/test-main.css']
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
		zip: {
			ziped: {
				router: function (filepath) {
					return filepath.split('/').slice(1).join('/');
				},
				src: ['application/**/*'],
				dest: 'bild/package.nw'
			}
		},
		unzip: {
			unziped: {
				router: function (filepath) {
					return filepath.split('/').slice(1).join('/');
				},
				src: `.cache/v${gc.version}.zip`,
				dest: `.cache/${gc.version}/`
			}
		}
	});
	grunt.registerTask('default', [
		'downloader',
		'unzip'
		/*
		'clean:all',
		'webfont',
		'ttf2woff2',
		'less',
		'cssmin',
		'requirejs',
		'concat',
		'uglify',
		'pug',
		// download nwjs
		// download ffmpeg
		'copy',
		'zip',
		// build YourRadio
		// resource haker
		'clean:dev',
		*/
	]);
}