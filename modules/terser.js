const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const colors = require("ansi-colors");
const { log, logError, breakLn } = require("./log.js");

const getPath = (...args) => path.join(...args).replace(/[\\]+/g, "/");

const start = async (options) => {
	options = Object.assign(
		{
			sdk: false,
			src: "",
			dest: "",
			maxLength: 9
		},
		options
	);

	log(colors.yellowBright("Минимизация modules"), true);
	breakLn();

	const srcDir = options.src;
	const outDir = options.dest;

	if (!fs.existsSync(srcDir)) {
		throw new Error(`Исходная директория не найдена: ${srcDir}`);
		return;
	}

	// Только .js файлы
	const items = fs.readdirSync(srcDir, { withFileTypes: true })
		.filter(file => file.isFile() && file.name.endsWith(".js"))
		.map(file => ({
			src: path.join(srcDir, file.name),
			dest: getPath(outDir, file.name)
		}));

	for (const item of items) {
		try {
			log(
				colors.yellowBright("Минимизация".padStart(options.maxLength)) +
					": " +
					colors.cyanBright(item.src) +
					' -> ' +
					colors.cyanBright(item.dest)
			);

			const srcCode = fs.readFileSync(item.src, "utf8");
			const result = await minify(srcCode, {
				compress: true,
				mangle: true,
				sourceMap: false,
				output: { comments: false },
				warnings: true,
			});

			const writeCode = options.sdk ? srcCode : result.code;

			fs.writeFileSync(
				item.dest,
				`/**!
 * Module ${path.basename(item.dest)} for "Your Radio"
 *
 * @author	ProjectSoft <projectsoft2009@yandex.ru>
 * @license GPL-3.0
 */
` + writeCode + "\n",
				"utf8"
			);
		} catch (e) {
			const report = {
				file: item.src.replace(/\\/g, "/"),
				message: e.message,
				line: e.line,
				col: e.col,
				pos: e.pos,
			};
			throw report;
		}
	}
	breakLn();
	log(colors.yellowBright("Минимизация modules завершена"), true);
	breakLn();
};

module.exports = start;
