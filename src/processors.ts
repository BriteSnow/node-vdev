import rollup_cjs from '@rollup/plugin-commonjs';
import rollup_multi from '@rollup/plugin-multi-entry';
import rollup_re from '@rollup/plugin-node-resolve';
import * as fs from 'fs-extra-plus';
/////// for handlebars
import { precompile as hbsPrecompile } from 'hbsp'; // promise style
import * as Path from 'path';
/////// for JS
import * as rollup from 'rollup';
import rollup_ts from 'rollup-plugin-typescript2'; // TODO: might want to update to @rollup/plugin-typescript (But it is a different implementation)
import { now } from './utils';

//////// for Postcss
const postcss = require("postcss");
const processors = [
	require("autoprefixer"),
	require("postcss-import"),
	require("postcss-mixins"),
	require("postcss-nested")
];

// --------- For Handlebars --------- //
export async function tmplFiles(files: string[], distFile: string) {

	await fs.saferRemove([distFile]);

	const templateContent = [];

	for (let file of files) {

		const htmlTemplate = await fs.readFile(file, "utf8");
		const template = await hbsPrecompile(file, htmlTemplate);
		templateContent.push(template);
	}

	await fs.writeFile(distFile, templateContent.join("\n"), "utf8");
}
// --------- /For Handlebars --------- //

// --------- For postCss --------- //
export async function pcssFiles(entries: string[], distFile: string) {

	const mapFile = distFile + ".map";
	let pcssResult: any;
	try {

		await fs.saferRemove([distFile, mapFile]);

		const processor = postcss(processors);
		const pcssNodes = [];

		// we parse all of the .pcss files
		for (let srcFile of entries) {
			// read the file
			let pcss = await fs.readFile(srcFile, "utf8");

			const pcssNode = postcss.parse(pcss, {
				from: srcFile
			});
			pcssNodes.push(pcssNode);
		}

		// build build the combined rootNode and its result
		let rootNode = null;
		for (let pcssNode of pcssNodes) {
			rootNode = (rootNode) ? rootNode.append(pcssNode) : pcssNode;
		}
		const rootNodeResult = rootNode.toResult();

		// we process the rootNodeResult
		pcssResult = await processor.process(rootNodeResult, {
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
export interface RollupFilesOptions {
	ts?: boolean;
	/* {importName: globalName} - (default undefined) define the list of global names (assumed to be mapped to window._name_) */
	globals?: { [importName: string]: string };
	watch: boolean;
	tsconfig?: any;
}
const defaultOpts: RollupFilesOptions = {
	ts: true,
	watch: false
};

/**
 * @param {*} opts 
 *    - ts?: boolean - (default true)
 *    - 
 *    - watch: true | false (default false)
 */
export async function rollupFiles(entries: string[], distFile: string, opts: RollupFilesOptions) {
	opts = Object.assign({}, defaultOpts, opts);

	await fs.saferRemove("./.rpt2_cache");

	// delete the previous ouutput files
	const mapFile = distFile + ".map";
	try {
		// Note: Do not delete the distFile if we are in watch mode, otherwise, rollup throw an uncatched promise exception
		if (!opts.watch) {
			await fs.saferRemove(distFile);
		}
		await fs.saferRemove(mapFile);
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
		// NOTE: 2019-01-10 for now skip the plugin warning because of ONGENERATE_HOOK_DEPRECATED on rpt2
		if (warning.code === 'PLUGIN_WARNING') {
			skip = true;
		}

		if (!skip) {
			console.log(`rollup warning - ${warning.message}`);
		}
	};
	// --------- /Exclude 3rd Party circular Dependencies --------- //

	// set the default rollup output options
	// make the name from file name "web/js/lib-bundle.js" : "lib_bundle"
	const name = Path.parse(distFile).name.replace(/\W+/g, "_");
	const outputOptions: any = {
		file: distFile,
		format: 'iife',
		name,
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

			watcher.on('event', async function (evt) {
				// console.log('rollup watch', evt.code, evt.output);
				if (evt.code === 'START') {
					startTime = now();
				} else if (evt.code === 'END') {
					let size = (await fs.stat(distFile)).size;
					size = Math.round(size / 1000.0);
					console.log(`Recompile ${distFile} - ${Math.round(now() - startTime)}ms -  ${size} kb`);
				} else if (evt.code === 'ERROR') {
					console.log(`ERROR - Rollup/Typescript error when processing: ${distFile}`);
					console.log("\t" + evt.error);
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


