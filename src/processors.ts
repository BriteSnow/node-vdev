import { now, saferRemove } from './utils';
import * as path from 'path';
import * as fs from 'fs-extra-plus';

//////// for Postcss
const postcss = require("postcss");
const processors = [
	require("postcss-import"),
	require("postcss-mixins"),
	require("postcss-nested")
];

/////// for JS
import * as rollup from 'rollup';
import rollup_cjs = require('rollup-plugin-commonjs');
import rollup_re = require('rollup-plugin-node-resolve');
import rollup_ts = require('rollup-plugin-typescript2');
import rollup_multi = require('rollup-plugin-multi-entry');

/////// for handlebars
import { precompile as hbsPrecompile } from 'hbsp'; // promise style

// --------- For Handlebars --------- //
export async function tmplFiles(files: string[], distFile: string) {

	await fs.saferRemove([distFile]);

	var templateContent = [];

	for (let file of files) {

		let htmlTemplate = await fs.readFile(file, "utf8");
		let template = await hbsPrecompile(file, htmlTemplate);
		templateContent.push(template);
	}

	await fs.writeFile(distFile, templateContent.join("\n"), "utf8");
}
// --------- /For Handlebars --------- //

// --------- For postCss --------- //
export async function pcssFiles(entries: string[], distFile: string) {

	var mapFile = distFile + ".map";
	try {

		await fs.saferRemove([distFile, mapFile]);

		var processor = postcss(processors);
		var pcssNodes = [];

		// we parse all of the .pcss files
		for (let srcFile of entries) {
			// read the file
			let pcss = await fs.readFile(srcFile, "utf8");

			var pcssNode = postcss.parse(pcss, {
				from: srcFile
			});
			pcssNodes.push(pcssNode);
		}

		// build build the combined rootNode and its result
		var rootNode = null;
		for (let pcssNode of pcssNodes) {
			rootNode = (rootNode) ? rootNode.append(pcssNode) : pcssNode;
		}
		var rootNodeResult = rootNode.toResult();

		// we process the rootNodeResult
		var pcssResult = await processor.process(rootNodeResult, {
			from: "undefined",
			to: distFile,
			map: { inline: false }
		});
	} catch (ex) {
		console.log(`postcss ERROR - Cannot process ${distFile} because (setting css empty file) \n${ex}`);
		// we write the .css and .map files
		await fs.writeFile(distFile, "", "utf8");
		await fs.writeFile(mapFile, "", "utf8");
		return;
	}

	// we write the .css and .map files
	await fs.writeFile(distFile, pcssResult.css, "utf8");
	await fs.writeFile(mapFile, pcssResult.map, "utf8");
}
// --------- /For postCss --------- //


// --------- For Rollup (JavaScript) --------- //
var defaultOpts = {
	ts: true,
	watch: false
};

/**
 * @param {*} entries 
 * @param {*} distFile 
 * @param {*} opts 
 *    - ts?: boolean - (default true)
 *    - globals?: {importName: globalName} - (default undefined) define the list of global names (assumed to be mapped to window._name_)
 *    - watch: true | false (default false)
 */
export async function rollupFiles(entries: string[], distFile: string, opts: any) {
	opts = Object.assign({}, defaultOpts, opts);

	await saferRemove("./.rpt2_cache", false);

	// delete the previous ouutput files
	var mapFile = distFile + ".map";
	try {
		// Note: Do not delete the distFile if we are in watch mode, otherwise, rollup throw an uncatched promise exception
		if (!opts.watch) {
			await saferRemove(distFile, false);
		}
		await saferRemove(mapFile, false);
	} catch (ex) {
		console.log(`Can't delete dist files`, ex);
	}

	// set the default rollup input options
	const inputOptions: any = {
		input: entries,
		plugins: [rollup_multi(), rollup_cjs(), rollup_re()]
	};

	// --------- Exclude 3rd Party circular Dependencies --------- //
	const excludeCircularWarningByImporters = ['node_modules/d3'];
	inputOptions.onwarn = function onwarn(warning: any) {
		let skip = false;

		if (warning.code === 'CIRCULAR_DEPENDENCY') {
			for (let skipImporter of excludeCircularWarningByImporters) {
				if (warning.importer.startsWith(skipImporter)) {
					skip = true;
					break;
				}
			}
		}
		if (!skip) {
			console.log(`rollup warning - ${warning.message}`);
		}
	};
	// --------- /Exclude 3rd Party circular Dependencies --------- //

	// set the default rollup output options
	// make the name from file name "web/js/lib-bundle.js" : "lib_bundle"
	var name = path.parse(distFile).name.replace(/\W+/g, "_");
	const outputOptions: any = {
		file: distFile,
		format: 'iife',
		name: name,
		sourcemap: true,
		sourcemapFile: mapFile
	};

	// if ts, then, we add the rollup_ts plugin
	if (opts.ts || opts.tsconfig) {
		let tsOpts: any = {
			clean: true
		};
		if (opts.tsconfig) {
			tsOpts.tsconfig = opts.tsconfig;
		}
		// Note: if we do not have clean:true, we get some exception when watch.
		inputOptions.plugins.push(rollup_ts(tsOpts));
	}

	// if we have some globals, we add them accordingly
	if (opts.globals) {
		// for input, just set the external (clone to be safe(r))
		inputOptions.external = Object.keys(opts.globals);
		outputOptions.globals = opts.globals;
	}

	try {
		// if it is watch mode, we do the watch
		if (opts.watch) {
			//wathOptions = { inputOptions };
			let watchOptions = { ...inputOptions };
			watchOptions.output = outputOptions;
			watchOptions.watch = { chokidar: true };

			const watcher = rollup.watch(watchOptions);
			let startTime: number;

			watcher.on('event', function (evt) {
				// console.log('rollup watch', evt.code, evt.output);
				if (evt.code === 'START') {
					startTime = now();
				} else if (evt.code === 'END') {
					console.log(`Recompile ${distFile} done: ${Math.round(now() - startTime)}ms`);
				} else if (evt.code === 'ERROR') {
					console.log(`ERROR - Rollup/Typescript error when processing: ${distFile}`);
					console.log("\t" + evt.error);
				} else if (evt.code === 'FATAL') {
					console.log(`FATAL ERROR - Rollup/Typescript fatal error when processing ${distFile}\n
					>>>>>>>> MUST RESTART WATCH SESSION <<<<<<<<\n\n`, evt.error);
				}

			});


		}
		// otherwise, we do the full build
		else {
			// bundle
			const bundle = await rollup.rollup(inputOptions);

			// write
			await bundle.write(outputOptions);
		}


		// make sure the .rpt2_cache/ folder is delete (apparently, clean:true does not work)
		//await fs.remove("./.rpt2_cache");
	} catch (ex) {
		// make sure we write nothing in the file, to know nothing got compiled and fail early
		await fs.writeFile(distFile, "", "utf8");
		throw ex;
	}
}
// --------- /For Rollup (JavaScript) --------- //


