import { saferRemove } from 'backlib';
import * as fs from 'fs-extra';
import * as Path from 'path';
import { BaseObj } from './base';
import { getBuilders } from './builder';
import { now, Partial, printLog } from './utils';
import { loadVdevConfig } from './vdev-config';
import { WebBundle } from './web-bundle-types';



// --------- Public Types --------- //
export interface Block extends BaseObj {
	name: string;
	dir: string;
	webBundles?: WebBundle[];
	baseDistDir?: string;
	dbuildDependencies?: string | string[];
	[key: string]: any;
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
				await saferRemove(fileToDelete);
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
			await buildBlock(block);
		}
	} else {
		for (let name of names) {
			const blockAndBundle = name.split('/');
			// if only .length === 1 then blockAndBundle[1] which is fine
			await buildBlock(blockAndBundle[0], { onlyBundleName: blockAndBundle[1] });
		}
	}
}


// TODO: needs to add support for any block rule watch
// TODO: needs to add support for only one bundle watch
export async function watchBlock(blockName: string) {
	const blocks = await loadBlocks();
	const block = blocks[blockName];

	await buildBlock(block, { watch: true });
}

export interface BuildOptions {
	watch?: boolean; // for rollup bundles for now
	full?: boolean; // for maven for including unit test (not implemented yet)
	onlyBundleName?: string; // A>W
}


const blockBuilt = new Set<string>();
/**
 * Build a and block and eventually a bundle
 * @param blockName 
 * @param opts 
 */
export async function buildBlock(blockOrName: string | Block, opts?: BuildOptions) {
	let block: Block;

	//// get the bloxc
	if (typeof blockOrName == 'string') {
		const blockByNames = await loadBlocks();
		block = blockByNames[blockOrName];
		if (!block) {
			throw new Error(`No block found for blockeName ${blockOrName}.`);
		}
	} else {
		block = blockOrName;
	}

	//// if already built, skip
	if (blockBuilt.has(block.name)) {
		console.log(`-------- Block ${block.name} already built - SKIP\n`);
		return;
	}

	//// execute the build
	console.log(`-------- Building Block ${block.name} ${block.dir}`);

	const builders = await getBuilders(block);

	const startBlock = now();
	for (const builder of builders) {
		const startBuilder = now();
		console.log(`---- running builder ${builder.name}`);
		await builder.build(block, opts?.watch);
		await printLog(`---- running builder ${builder.name} DONE`, startBuilder);
		console.log();
	}

	await printLog(`-------- Building Block ${block.name} DONE`, startBlock);
	console.log();

	blockBuilt.add(block.name);
}






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


// --------- /Private Utils --------- //
