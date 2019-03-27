import { ParsedArgs } from 'minimist';
import { asNames, buildBlocksOrBundles, cleanNodeFiles, updateVersions, watchBlock } from '../main';
import { CmdMap } from '../utils';


export const cmds: CmdMap = {
	build, watch
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



async function watch(argv: ParsedArgs) {
	const blockStr = argv._[0];
	watchBlock(blockStr);
}