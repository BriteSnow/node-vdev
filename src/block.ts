import * as chokidar from 'chokidar';
import glob from 'fast-glob';
import * as fs from 'fs-extra-plus';
import { spawn } from 'p-spawn';
import * as Path from 'path';
import { BaseObj } from './base';
import { pcssFiles, rollupFiles, tmplFiles } from './processors';
import { asNames, now, Partial, printLog, readJsonFileWithComments } from './utils';
import { loadVdevConfig } from './vdev-config';


// --------- Public Types --------- //
export interface Block extends BaseObj {
	name: string;
	dir: string;
	webBundles?: WebBundle[];
	baseDistDir?: string;
	dbuildDependencies?: string | string[];
	[key: string]: any;
}

export interface WebBundle {
	name: string;
	/** The entries, support wild cards, to be compiled */
	entries: string | string[];

	/** To specify glob/files to watch in place of the entries (only used in watch mode, and not for .js/.ts) */
	watch?: string | string[];

	rollupOptions?: any;
	dist: string; // distribution file path (from .dir)


	type?: string; // set in the buildWebBundles
	dir?: string; // set in the initWebBundle
}

export type BlockByName = { [name: string]: Block };
// --------- /Public Types --------- //

export async function updateVersions(config?: any) {
	if (!config) {
		config = await loadVdevConfig();
	}
	const versionFiles = config.version?.files as string[] ?? null;

	// if we do not have version files, we skip.
	if (versionFiles == null) {
		return;

	}
	const newVersion = config.__version__;


	let firstUpdate = false; // flag that will be set 
	try {
		for (let file of versionFiles) {
			const originalContent = (await fs.readFile(file, 'utf8')).toString();
			const isHTML = file.toLowerCase().endsWith('html');

			let fileAppVersion = getVersion(originalContent, isHTML);

			if (newVersion !== fileAppVersion) {
				// On the first update needed, we start the log section for the version update
				if (!firstUpdate) {
					console.log(`----- Version Update: Updating '__version__ = ".."' or '?v=..' to ${newVersion} `);
					firstUpdate = true;
				}

				console.log(`Changing  ${fileAppVersion} -> ${newVersion} in file: ${file}`);
				let newContent = replaceVersion(originalContent, newVersion, isHTML);
				await fs.writeFile(file, newContent, 'utf8');
			} else {
				// Note: for now, we do not log when nothing to do.
			}
		}
	} catch (ex) {
		throw new Error(`ERROR while doing versioning files - ${ex.message}`);
	}
	// if we have at least one update, we close the log section.
	if (firstUpdate) {
		console.log('----- /Version Update: done');
	}
}


// FIXME: Needs to look at the "blocks" from the config
export async function cleanNodeFiles() {
	const filesToDelete = ['./package-lock.json', './node_blockules'];

	const blocks = await loadBlocks();

	// dirs.unshift('./'); // we do not clean the base dir, as it is easy to do by hand, and then, scripts won't work
	// TODO: probably need to add web-server as well
	for (const block of Object.values(blocks)) {
		const dir = block.dir;
		for (let fName of filesToDelete) {
			const fileToDelete = Path.join(dir, fName);
			if ((await fs.pathExists(fileToDelete))) {
				await fs.saferRemove(fileToDelete);
			}
		}
	}
}

/**
 * 
 * @param names List of block name or block/bundle names
 */
export async function buildBlocksOrBundles(names: string[]) {
	if (names.length === 0) {
		const blocks = await loadBlocks();
		for (let block of Object.values(blocks)) {
			await _buildBlock(block);
		}
	} else {
		for (let name of names) {
			const blockAndBundle = name.split('/');
			// if only .length === 1 then blockAndBundle[1] which is fine
			await buildBlock(blockAndBundle[0], blockAndBundle[1]);
		}
	}
}


// TODO: needs to add support for any block rule watch
// TODO: needs to add support for only one bundle watch
export async function watchBlock(blockName: string) {
	const blocks = await loadBlocks();
	const block = blocks[blockName];

	const webBundles = (block) ? block.webBundles : null;
	if (webBundles == null) {
		throw new Error(`Block ${blockName} not found or does not have a '.webBundles'. As of now, can only watch webBundles`)
	}

	for (let bundle of webBundles) {
		await initWebBundle(block, bundle);

		// The rollup have a watch block, so we use it
		if (bundle.type === 'js' || bundle.type === 'ts') {
			if (bundle.watch) {
				console.log(`WARNING - Ignoring '.watch' property for bundle ${bundle.name} for .js/.ts processing
				as rollup watches dependencies. (advice: remove this .watch property for clarity)`);
			}
			await _buildBlock(block, bundle, { watch: true });
		}

		// Otherwise, we just watch the entries or the watch, and rebuild everything
		else {
			await _buildBlock(block, bundle);
			const toWatch = bundle.watch ?? bundle.entries;
			let watcher = chokidar.watch(toWatch, { persistent: true });
			// TODO: Needs to use a call reducer
			watcher.on('change', async function (filePath: string, stats) {
				if (filePath.endsWith(`.${bundle.type}`)) {
					await _buildBlock(block, bundle);
				}
			});
		}
	}
}

export interface BuildOptions {
	watch?: boolean; // for rollup bundles for now
	full?: boolean; // for maven for including unit test (not implemented yet)
}

/**
 * Build a and block and eventually a bundle
 * @param blockName 
 * @param opts 
 */
export async function buildBlock(blockName: string, onlyBundleName?: string, opts?: BuildOptions) {
	const blockByName = await loadBlocks();
	const block = blockByName[blockName];

	if (!block) {
		throw new Error(`No block found for blockeName ${blockName}.`);
	}

	let bundle: WebBundle | undefined;
	if (onlyBundleName && block.webBundles) {
		bundle = block.webBundles.find((b) => (b.name == onlyBundleName));
		if (!bundle) {
			throw new Error(`No webBundle ${onlyBundleName} found in block ${block.name}`);
		}
		await initWebBundle(block, bundle);
	}

	await _buildBlock(block, bundle, opts);
}

async function _buildBlock(block: Block, bundle?: WebBundle, opts?: BuildOptions) {

	const hasPomXml = await fs.pathExists(Path.join(block.dir, 'pom.xml'));
	const hasPackageJson = await fs.pathExists(Path.join(block.dir, 'package.json'));
	const hasDockerFile = await fs.pathExists(Path.join(block.dir, 'Dockerfile'));
	const hasTsConfig = await fs.pathExists(Path.join(block.dir, 'tsconfig.json'));
	const hasWebBundles = (block.webBundles) ? true : false;

	// Note: if we have a bundleName, then, just the bundle log will be enough.
	const start = now();
	if (!bundle) {
		console.log(`------ Building Block ${block.name} ${block.dir}`);
	}

	// no matter what, if we have a pckageJson, we make sure we do a npm install
	if (hasPackageJson) {
		await npmInstall(block);
	}

	// if we have a webBundles, we build it
	if (hasWebBundles) {
		// TODO: need to allow to give a bundle name to just build it
		await buildWebBundles(block, bundle, opts);
	}

	// run tsc (with clean dist/ folder),  if it is not a webBundle (assume rollup will take care of the ts when webBundles)
	if (!hasWebBundles && hasTsConfig) {
		await buildTsSrc(block);
	}

	if (hasPomXml) {
		await runMvn(block, opts ? opts.full : false);
	}

	if (!bundle) {
		await printLog(`------ Building Block ${block.name} DONE`, start);
		console.log();
	}
}


async function npmInstall(block: Block) {
	await spawn('npm', ['install'], { cwd: block.dir });
}

async function buildTsSrc(block: Block) {
	const distDirNeedsDelete = false;

	const distDir = Path.join(block.dir, '/dist/');
	const distDirExist = await fs.pathExists(distDir);

	// if we have distDirExist, check that it define as compileOptions.outDir in 
	if (distDirExist) {
		const tsconfigObj = await readJsonFileWithComments(Path.join(block.dir, 'tsconfig.json'));
		let outDir = tsconfigObj.compilerOptions.outDir as string | undefined | null;
		outDir = (outDir) ? Path.join(block.dir, outDir, '/') : null; // add a ending '/' to normalize all of the dir path with ending / (join will remove duplicate)
		if (outDir === distDir) {
			console.log(`tsc prep - deleting tsc distDir ${distDir}`);
			await fs.saferRemove(distDir);
		} else {
			console.log(`tss prep - skipping tsc distDir ${distDir} because does not match tsconfig.json compilerOptions.outDir ${outDir}`);
		}
	}

	// Assume there is a typescript installed in the root project
	await spawn('./node_modules/.bin/tsc', ['-p', block.dir]);
}

async function runMvn(block: Block, full?: boolean) {
	const args = ['clean', 'package'];
	if (!full) {
		args.push('-Dmaven.test.skip=true');
	}

	var start = now();

	await spawn('mvn', args, {
		toConsole: false,
		cwd: block.dir,
		onStderr: function (data: any) {
			process.stdout.write(data);
		}
	});

	await printLog(`maven build ${full ? 'with test' : ''}`, start);
}


// --------- Private WebBundle Utils --------- //
type WebBundler = (block: Block, webBundle: WebBundle, opts?: BuildOptions) => void;

// bundlers by type (which is file extension without '.')
const bundlers: { [type: string]: WebBundler } = {
	ts: buildTsBundler,
	pcss: buildPcssBundler,
	tmpl: buildTmplBundler,
	html: buildTmplBundler,
	js: buildJsBundler
}

async function buildWebBundles(block: Block, onlyBundle?: WebBundle, opts?: BuildOptions) {

	let webBundles: WebBundle[];

	if (onlyBundle) {
		// the onlyBundle is already initialized
		webBundles = [onlyBundle];
	} else {
		webBundles = block.webBundles!;
		// we need to initialize the webBundles
		for (let bundle of webBundles) {
			await initWebBundle(block, bundle);
		}
	}

	for (let bundle of webBundles!) {
		await ensureDist(bundle);
		var start = now();
		await bundlers[bundle.type!](block, bundle, opts);
		if (opts?.watch) {
			await printLog(`Starting watch mode for ${block.name}/${bundle.name} (${bundle.dist})`, start);
		} else {
			await printLog(`Building bundle ${block.name}/${bundle.name}`, start, bundle.dist);
		}

	}
}

const rollupOptionsDefaults = {
	ts: {
		watch: false,
		ts: true,
		tsconfig: './tsconfig.json'
	},
	js: {
		watch: false,
		ts: false
	}
}

/**
 * Initialize all of the bundle properties accordingly. 
 * This allow the bundlers and other logic to not have to worry about default values and path resolution.
 */
async function initWebBundle(block: Block, bundle: WebBundle) {

	bundle.type = Path.extname(asNames(bundle.entries)[0]).substring(1);

	// for now, just take the block.dir
	bundle.dir = specialPathResolve('', block.dir, bundle.dir);

	// Make the entries relative to the Block
	bundle.entries = asNames(bundle.entries).map((f) => specialPathResolve('', bundle.dir!, f));

	// If bundle.watch, same as entries above
	if (bundle.watch) {
		// Make the watch relative to the Block
		bundle.watch = asNames(bundle.watch).map((f) => specialPathResolve('', bundle.dir!, f));
	}

	// resolve the dist
	bundle.dist = specialPathResolve('', block.baseDistDir!, bundle.dist);


	// --------- rollupOptions initialization --------- //
	if (bundle.type === 'ts' || bundle.type === 'js') {
		// get the base default options for this type
		const rollupOptionsDefault = rollupOptionsDefaults[bundle.type];

		// override default it if bundle has one
		const rollupOptions = (bundle.rollupOptions) ? { ...rollupOptionsDefault, ...bundle.rollupOptions }
			: { ...rollupOptionsDefault };

		// resolve tsconfig
		if (rollupOptions.tsconfig) {
			rollupOptions.tsconfig = specialPathResolve('', bundle.dir, rollupOptions.tsconfig);
		}

		// set the new optoins back.
		bundle.rollupOptions = rollupOptions;
	}
	// --------- /rollupOptions initialization --------- //

}
// --------- /Private WebBundle Utils --------- //

// --------- Private Bundlers --------- //
async function buildTsBundler(block: Block, bundle: WebBundle, opts?: BuildOptions) {
	// TODO: need to re-enable watch
	try {
		if (opts && opts.watch) {
			bundle.rollupOptions.watch = true;
		}
		// resolve all of the entries (with glob)
		const allEntries = await resolveGlobs(bundle.entries);
		await rollupFiles(allEntries, bundle.dist, bundle.rollupOptions);
	} catch (ex) {
		// TODO: need to move exception ahndle to the caller
		console.log("BUILD ERROR - something when wrong on rollup\n\t", ex);
		console.log("Empty string was save to the app bundle");
		console.log("Trying saving again...");
		return;
	}
}

async function buildPcssBundler(block: Block, bundle: WebBundle, opts?: BuildOptions) {
	const allEntries = await resolveGlobs(bundle.entries);
	await pcssFiles(allEntries, bundle.dist);
}

async function buildTmplBundler(block: Block, bundle: WebBundle, opts?: BuildOptions) {
	const allEntries = await resolveGlobs(bundle.entries);
	await tmplFiles(allEntries, bundle.dist);
}

async function buildJsBundler(block: Block, bundle: WebBundle, opts?: BuildOptions) {
	if (opts && opts.watch) {
		bundle.rollupOptions.watch = true;
	}
	const allEntries = await resolveGlobs(bundle.entries);
	await rollupFiles(allEntries, bundle.dist, bundle.rollupOptions);
}
// --------- /Private Bundlers --------- //

// --------- Public Loaders --------- //
export async function loadDockerBlocks(): Promise<BlockByName> {
	const blocks = await loadBlocks();
	const dockerBlocks: BlockByName = {};
	for (let block of Object.values(blocks)) {
		const hasDockerfile = await fs.pathExists(Path.join(block.dir, 'Dockerfile'));
		if (hasDockerfile) {
			dockerBlocks[block.name] = block;
		}
	}
	return dockerBlocks;
}

export async function loadBlocks(): Promise<BlockByName> {
	const rawConfig = await loadVdevConfig();

	const rawBlocks = rawConfig.blocks;

	const base = {
		system: rawConfig.system,
		__version__: rawConfig.__version__,
		imageTag: rawConfig.imageTag
	}

	// build the services map from the raw services list
	const blockByName: { [name: string]: Block } = rawBlocks.map((item: string | any) => {
		let block: Partial<Block>;
		let name: string;

		// initialize the object
		if (typeof item === 'string') {
			block = {
				name: item
			}
		} else {
			if (!item.name) {
				throw new Error(`the build config file vdev.yaml has a block without '.name'`);
			}
			// we do a shallow clone			
			block = { ...item };
		}

		//// add the system/version (they should not been set in the block anyway)
		if (block.system != null || block.__version__ != null) {
			throw new Error(`.system or .__version__ cannot be set at the block level (but found in ${block.name})`);
		}
		Object.assign(block, base);


		// if the block does not have a dir, then, build it with the parent one
		if (!block.dir) {
			block.dir = Path.join(rawConfig.baseBlockDir, `${block.name}/`);
		}
		return block as Block;
	}).reduce((map: { [key: string]: Block }, block: Block) => {
		map[block.name] = block;
		return map;
	}, {});

	return blockByName;
}

export async function loadBlock(name: string): Promise<Block> {
	const blocks = await loadBlocks();
	const block = blocks[name];

	if (!block) {
		throw new Error(`Block ${name} not found`);
	}

	return block;
}


// --------- /Public Loaders --------- //

// --------- Private Utils --------- //

async function resolveGlobs(globs: string | string[]) {
	// resolve all of the entries (with glob)
	return glob(globs);
}


//#region    ---------- version Utils ---------- 

/** Return the first version found. For html, looks for the `src|href=....?v=___` and for other files the version = ... */
function getVersion(content: string, isHtml = false) {
	// look for the href or src ?v=...
	if (isHtml) {
		const rgx = /<.*(href|src).*?v=(.*?)(\"|\&)/gm;
		const r = rgx.exec(content);
		if (r != null && r.length > 2) {
			return r[2];
		} else {
			return null;
		}
	}
	// look for the version = ...
	else {
		var rx = new RegExp('__version__' + '\\s*[=:]\\s*[\'"](.*)[\'"]', 'i');
		var match = content.match(rx);
		return (match) ? match[1] : null;
	}
}

function replaceVersion(content: string, value: string, isHtml = false) {
	if (isHtml) {
		const rgxRep = /(<.*(href|src).*?v=).*?(\"|\&.*)/g;
		// $2 not is not used because it is included as part of $1
		return content.replace(rgxRep, '$1' + value + '$3');
	}
	else {
		var rx = new RegExp('(.*' + '__version__' + '\\s*[=:]\\s*["\']).*([\'"].*)', 'i');
		content = content.replace(rx, '$1' + value + '$2');
		return content;
	}
}

//#endregion ---------- /version Utils ---------- 

async function ensureDist(bundle: WebBundle) {
	const distDir = Path.dirname(bundle.dist);
	await fs.ensureDir(distDir);
}

/**
 * Special resolve that 
 *   - if finalPath null, then, return dir. 
 *   - resolve any path to dir if it starts with './' or '../', 
 *   - absolute path if it starts with '/' 
 *   - baseDir if the path does not start with either '/' or './'
 * @param baseDir 
 * @param dir
 * @param finalPath dir or file path
 */
export function specialPathResolve(baseDir: string, dir: string, finalPath?: string): string {
	if (finalPath == null) {
		return dir;
	}

	if (finalPath.startsWith('/')) {
		return finalPath;
	}
	if (finalPath.startsWith('./') || finalPath.startsWith('../')) {
		return Path.join(dir, finalPath)
	}
	return Path.join(baseDir, finalPath);
}
// --------- /Private Utils --------- //
