#!/usr/bin/env node
import minimist = require('minimist');
import { ParsedArgs } from 'minimist';
import { cmds as buildCmds } from './cmd-build';
import { cmds as dCmds } from './cmd-docker';
import { cmds as kCmds } from './cmd-k8s';
import { cmds as miscCmds } from './cmd-misc';
import { cmds as realmCmds } from './cmd-realm';
import { cmds as sCmds } from './cmd-storage';
import { CmdMap } from '../utils';

var argv = minimist(process.argv.slice(2), { '--': true });

const allCmds: CmdMap = {
	...buildCmds,
	...dCmds,
	...kCmds,
	...miscCmds,
	...realmCmds,
	...sCmds
}

run(argv);


async function run(agv: ParsedArgs) {
	const cmdName = argv._[0]; // 'kcreate', 'nclean'

	try {
		const fn = (allCmds && cmdName) ? allCmds[cmdName] : null;

		if (!fn) {
			throw new Error(`comamnd ${argv._} unknown`);
		}

		// remove the "routing commands" so that the command fn get the specialize context
		const miniArgv = { ...argv }; // shallow copy
		miniArgv._ = miniArgv._.slice(1); // new array

		// add the rawArgv from same index in case the fn needs it
		const rawArgv = process.argv.slice(3);

		await fn(miniArgv, rawArgv);

	} catch (ex) {
		console.log(`${ex}`);
	}

}






