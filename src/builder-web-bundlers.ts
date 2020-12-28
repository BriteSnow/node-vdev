import { glob } from 'backlib';
import * as chokidar from 'chokidar';
import { ensureDir } from 'fs-extra';
import * as Path from 'path';
import { asArray } from 'utils-min';
import type { Block } from './block';
import { registerBuilder } from './builder';
import { pcssFiles, rollupFiles, tmplFiles } from './builder-web-bundlers-processors';
import { asNames, printLog } from './utils';
import { WebBundle } from './web-bundle-types';

const now = Date.now;

const bundle_types = ['ts', 'js', 'pcss', 'tmpl', 'html'] as const;
type BundleType = typeof bundle_types[number];

async function buildBundles(block: Block, type: BundleType | BundleType[], watch?: boolean) {
	const typeSet = new Set<string>(asArray(type));
	for (const bundle of block.webBundles!) {

		if (typeSet.has(bundle.type!)) {
			const type = bundle.type! as BundleType;
			const bundler = bundlers[type];
			await ensureDist(bundle);

			let start = now();

			// if js or ts, watch is part of the bundler
			if (bundle.type === 'js' || bundle.type === 'ts') {
				if (bundle.watch) {
					console.log(`WARNING - Ignoring '.watch' property for bundle ${bundle.name} for .js/.ts processing
				as rollup watches dependencies. (advice: remove this .watch property for clarity)`);
				}
				await bundler(block, bundle, watch);
			}
			// otherwise, implement the watch
			else {
				await bundler(block, bundle);
				if (watch) {
					const toWatch = bundle.watch ?? bundle.entries;
					let watcher = chokidar.watch(toWatch, { persistent: true });
					// TODO: Needs to use a call reducer
					watcher.on('change', async function (filePath: string, stats) {
						if (filePath.endsWith(`.${bundle.type}`)) {
							await bundler(block, bundle);
						}
					});
				}
			}

			if (watch) {
				await printLog(`Starting watch mode for ${block.name}/${bundle.name} (${bundle.dist})`, start);
			} else {
				await printLog(`Building bundle ${block.name}/${bundle.name}`, start, bundle.dist);
			}

		}
	}
}

async function hasBundleType(block: Block, ...type: BundleType[]) {
	if (block.webBundles) {
		const typeSet = new Set<string>(type);
		for (let bundle of block.webBundles) {
			await initWebBundle(block, bundle);
			if (typeSet.has(bundle.type!)) return true;
		}
	}

	return false;
}

//#region    ---------- builder - ts_bundler ---------- 
registerBuilder({
	name: 'ts_bundler',
	predicate: async (block: Block) => {
		return hasBundleType(block, 'ts');
	},
	order: 0,
	replace: ['tsc'], // replace the typescript builder

	build: async (block: Block, watch = false) => {
		await buildBundles(block, 'ts', watch);
	}
});
//#endregion ---------- /builder - ts_bundler ----------


//#region    ---------- builder - js_bundler ---------- 
registerBuilder({
	name: 'js_bundler',
	predicate: async (block: Block) => {
		return hasBundleType(block, 'js');
	},
	order: 0,

	build: async (block: Block, watch = false) => {
		await buildBundles(block, 'js', watch);
	}
});
//#endregion ---------- /builder - js_bundler ----------

//#region    ---------- builder - pcss_bundler ---------- 
registerBuilder({
	name: 'pcss_bundler',
	predicate: async (block: Block) => {
		return hasBundleType(block, 'pcss');
	},
	order: 0,

	build: async (block: Block, watch = false) => {
		await buildBundles(block, 'pcss', watch);
	}
});
//#endregion ---------- /builder - pcss_bundler ----------


//#region    ---------- builder - tmpl_bundler ---------- 
registerBuilder({
	name: 'tmpl_bundler',
	predicate: async (block: Block) => {
		return hasBundleType(block, 'tmpl', 'html');
	},
	order: 0,

	build: async (block: Block, watch = false) => {
		await buildBundles(block, ['tmpl', 'html'], watch);
	}
});
//#endregion ---------- /builder - tmpl_bundler ----------

//#region    ---------- webBundler utils ---------- 
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

type WebBundler = (block: Block, webBundle: WebBundle, watch?: boolean) => void;

// bundlers by type (which is file extension without '.')
const bundlers: { [type in BundleType]: WebBundler } = {
	ts: buildTsBundler,
	pcss: buildPcssBundler,
	tmpl: buildTmplBundler,
	html: buildTmplBundler,
	js: buildJsBundler
}


/**
 * Initialize all of the bundle properties accordingly. 
 * This allow the bundlers and other logic to not have to worry about default values and path resolution.
 */
async function initWebBundle(block: Block, bundle: WebBundle) {
	if (bundle.type != null) return; // assume already initalized

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


	// rollup initialization
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

}

async function ensureDist(bundle: WebBundle) {
	const distDir = Path.dirname(bundle.dist);
	await ensureDir(distDir);
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
//#endregion ---------- /webBundler utils ----------


//#region    ---------- Private Bundlers ---------- 
async function buildTsBundler(block: Block, bundle: WebBundle, watch?: boolean) {
	// TODO: need to re-enable watch
	try {
		if (watch) {
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

async function buildPcssBundler(block: Block, bundle: WebBundle, watch?: boolean) {
	const allEntries = await resolveGlobs(bundle.entries);
	await pcssFiles(allEntries, bundle.dist);
}

async function buildTmplBundler(block: Block, bundle: WebBundle, watch?: boolean) {
	const allEntries = await resolveGlobs(bundle.entries);
	await tmplFiles(allEntries, bundle.dist);
}

async function buildJsBundler(block: Block, bundle: WebBundle, watch?: boolean) {
	if (watch) {
		bundle.rollupOptions.watch = true;
	}
	const allEntries = await resolveGlobs(bundle.entries);
	await rollupFiles(allEntries, bundle.dist, bundle.rollupOptions);
}
//#endregion ---------- /Private Bundlers ----------


/** Since 0.11.18 each string glob is sorted within their match, but if globs is an array, the order of each result glob result is preserved. */
async function resolveGlobs(globs: string | string[]) {
	if (typeof globs === 'string') {
		return glob(globs);
	} else {
		const lists: string[][] = [];
		for (const globStr of globs) {
			const list = await glob(globStr);
			lists.push(list);
		}
		return lists.flat();
	}

}