import { saferRemove } from 'backlib';
import { pathExists } from 'fs-extra';
import { spawn } from 'p-spawn';
import * as Path from 'path';
import type { Block } from './block';
import { registerBuilder } from './builder';
import { readJsonFileWithComments } from './utils';


//#region    ---------- builder - npm install - 'package.json' ---------- 
registerBuilder({
	name: 'npm_install',
	predicate: 'package.json',
	order: -1024, // highest order

	build: async (block: Block) => {
		await spawn('npm', ['install'], { cwd: block.dir });
	}
});
//#endregion ---------- /builder - npm install - 'package.json' ---------- 


//#region    ---------- builder - tsc - 'tsconfig.json' ---------- 
registerBuilder({
	name: 'tsc',
	predicate: 'tsconfig.json',
	order: 0,

	build: async (block: Block, watch = false) => {
		const distDirNeedsDelete = false;

		const distDir = Path.join(block.dir, '/dist/');
		const distDirExist = await pathExists(distDir);

		// if we have distDirExist, check that it define as compileOptions.outDir in 
		if (distDirExist) {
			const tsconfigObj = await readJsonFileWithComments(Path.join(block.dir, 'tsconfig.json'));
			let outDir = tsconfigObj.compilerOptions.outDir as string | undefined | null;
			outDir = (outDir) ? Path.join(block.dir, outDir, '/') : null; // add a ending '/' to normalize all of the dir path with ending / (join will remove duplicate)
			if (outDir === distDir) {
				console.log(`tsc prep - deleting tsc distDir ${distDir}`);
				await saferRemove(distDir);
			} else {
				console.log(`tss prep - skipping tsc distDir ${distDir} because does not match tsconfig.json compilerOptions.outDir ${outDir}`);
			}
		}

		// Assume there is a typescript installed in the root project
		await spawn('./node_modules/.bin/tsc', ['-p', block.dir]);
	}
});
//#endregion ---------- /builder - tsc - 'tsconfig.json' ---------- 

//#region    ---------- builder - rollup - 'rollup.config.js' ---------- 
registerBuilder({
	name: 'rollup',
	predicate: 'rollup.config.js',
	order: 0,
	replace: ['tsc'], // replace the typescript builder

	build: async (block: Block, watch = false) => {
		// Assume there is a typescript installed in the root project
		const nodeModuleDir = Path.relative(block.dir, './node_modules/');
		const bin = Path.join(nodeModuleDir, '.bin/rollup');
		const args = ['-c'];
		if (watch) args.push('-w');
		await spawn(bin, args, { cwd: block.dir });
	}
});
//#endregion ---------- /builder - rollup - 'rollup.config.js' ----------


//#region    ---------- builder - pcss - 'pcss.config.js' ---------- 
registerBuilder({
	name: 'pcss',
	predicate: 'pcss.config.js',
	order: 0,

	build: async (block: Block, watch = false) => {
		// Assume there is a typescript installed in the root project
		const nodeModuleDir = Path.relative(block.dir, './node_modules/');
		const bin = Path.join(nodeModuleDir, '.bin/pcss');
		const args = [];
		if (watch) args.push('-w');
		await spawn(bin, args, { cwd: block.dir });
	}
});
//#endregion ---------- /builder - pcss - 'pcss.config.js' ----------


//#region    ---------- builder - hbs - 'hbs.config.js' ---------- 
registerBuilder({
	name: 'hbs',
	predicate: 'hbs.config.js',
	order: 0,

	build: async (block: Block, watch = false) => {
		// Assume there is a typescript installed in the root project
		const nodeModuleDir = Path.relative(block.dir, './node_modules/');
		const bin = Path.join(nodeModuleDir, '.bin/hbs');
		const args = [];
		if (watch) args.push('-w');
		await spawn(bin, args, { cwd: block.dir });
	}
});
//#endregion ---------- /builder - hbs - 'hbs.config.js' ----------
