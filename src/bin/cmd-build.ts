import { cleanNodeFiles, updateVersions, buildBlocksOrBundles, watchBlock, loadDockerBlocks, loadBlock } from '../main';
import * as fs from 'fs-extra-plus';
import * as path from 'path';
import { Realm, getCurrentRealm, assertRealm } from '../main';
import { buildDockerImage } from '../main';
import { asNames, now, printLog } from '../main';
import { ParsedArgs } from 'minimist';
import { CmdMap } from '../utils';


export const cmds: CmdMap = {
	version, clean, build, dbuild, watch
}

async function version() {
	await updateVersions();
}

async function clean() {
	await cleanNodeFiles();
}

/**
 * 
 * @param blockPathsStr could be 'web-server' or multiple 'web-server,gb-down' or with bundle 'web/app,web/lib'
 */
async function build(argv: ParsedArgs) {
	const blockPathsStr = argv._[0];
	// split eventual comman delimited string
	await buildBlocksOrBundles(asNames(blockPathsStr));
}

async function dbuild(argv: ParsedArgs) {
	const blockStr = argv._[0];

	const realm = assertRealm(await getCurrentRealm());
	const dockerBlocks = await loadDockerBlocks();

	const nameFilterSet = (blockStr) ? new Set(asNames(blockStr)) : null;

	for (let dockerBlock of Object.values(dockerBlocks)) {
		if (nameFilterSet === null || nameFilterSet.has(dockerBlock.name)) {
			await buildDockerImage(realm, dockerBlock);
			console.log();
		}
	}
}

async function watch(argv: ParsedArgs) {
	const blockStr = argv._[0];
	watchBlock(blockStr);
}