module.exports = function(grunt) {
	process.removeAllListeners('warning');
	require('dotenv').config();
	// target=true - nwjs sdk = nortmal
	// target=false - nwjs sdk = sdk
	// update=true - произвести скачивание nwjs и ffmpeg
	// update=false - не производить скачивание nwjs и ffmpeg
	// В корне проекта присутствие файла .env обязятельно
	// Параметры NWJS_TARGET и NWJS_UPDATE должны быть заданы. 
	// При первом запуске или смене SDK NWJS_UPDATE должен быть равен 1
	// NWJS_VERSION должен содержать номер нужной версии или 0 для загрузки последней
	const target = process.env.NWJS_TARGET == "1" ? true : false,
		update = process.env.NWJS_UPDATE == "1" ? true : false,
		version = process.env.NWJS_VERSION == "0" ? false : process.env.NWJS_VERSION; // 0.87.0
	console.log(target, update, version);

	grunt.loadNpmTasks('innosetup-compiler');
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);
	require('./modules/Downloader.js')(grunt);
	require('./modules/Build.js')(grunt);
	require('./modules/Versions.js')(grunt);
	const path = require('path');
	var gc = {
			sdk: target ? 'normal' : 'sdk',
			version: version
		},
		flv = '',
		pkg = grunt.file.readJSON('package.json');

	flv = gc.sdk == 'normal' ? '' : '-sdk';
	console.log(grunt.template.date(new Date().getTime(), 'yyyy-mm-dd'));
	grunt.initConfig({
		globalConfig: gc,
		pkg: pkg,
		clean: {
			options: {
				force: true
			},
			all: [
				"build/**/*",
				"*-lock.json",
				'application/css/',
				'application/fonts/',
				'application/js/',
				'application/*-lock.json',
				'application/*.sublime-*',
				'test/'
			],
			vk: [
				'build/YourRadio.exe',
				'build/vk_*',
				'build/vulkan*',
				'build/swiftshader',
				'build/locales/*.info'
			],
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
						cwd: `.cache/${gc.sdk}`,
						src: "**",
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
					template: 'src/radioapp.less'
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
		version_edit: {
			default: {
				options: {
					pkg: pkg,
				}
			}
		},
		downloader: {
			down: {
				options: {
					version: gc.version,
					sdk: gc.sdk == 'normal' ? false : true
				}
			}
		},
		zip: {
			ziped: {
				router: function (filepath) {
					return filepath.split('/').slice(1).join('/');
				},
				src: ['application/**/*'],
				dest: 'build/package.nw'
			}
		},
		unzip: {
			unzip_001: {
				router: function (filepath) {
					return filepath.split('/').slice(1).join('/');
				},
				src: `.cache/${gc.sdk}.zip`,
				dest: `.cache/${gc.sdk}/`
			},
			unzip_002: {
				src: `.cache/ffmpeg.zip`,
				dest: `.cache/${gc.sdk}/`
			},
		},
		buildnw: {
			build: {}
		},
		innosetup: {
			default: {
				options: {
					gui: false,
					verbose: true,
				},
				script: __dirname + "/setup.iss"
			}
		},
		exec: {
			// Compiling install file
			// Run YourRadio
			run: {
				command: __dirname + '/build/nw.exe ' + __dirname + '/application'
			}
		},
	});
	const tasks = [
		'clean:all',
		'webfont',
		'ttf2woff2',
		'less',
		'cssmin',
		'requirejs',
		'concat',
		'uglify',
		'pug',
	];
	update && tasks.push('downloader');
	tasks.push('unzip', 'version_edit', 'copy');
	target && tasks.push('zip');
	tasks.push('clean:vk');
	target ? tasks.push('buildnw', 'innosetup') : tasks.push('exec:run');
	grunt.registerTask('default', tasks);
}