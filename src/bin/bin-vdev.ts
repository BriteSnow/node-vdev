#!/usr/bin/env node
import minimist = require('minimist');
import { ParsedArgs } from 'minimist';
import { cmds as gsCmds } from './cmd-gs';
import { cmds as buildCmds } from './cmd-build';
import { cmds as opsCmds } from './cmd-ops';
import { CmdMap } from '../utils';

var argv = minimist(process.argv.slice(2), { '--': true });

const allCmds: { [domainName: string]: CmdMap } = {
	gs: gsCmds,
	build: buildCmds,
	ops: opsCmds
}

run(argv);


async function run(agv: ParsedArgs) {
	const domain = argv._[0]; // domain command (like 'gs' 'realm');
	const cmdName = argv._[1]; // first  command (like 'ls' 'cp');

	const cmds = allCmds[domain];
	try {
		const fn = (cmds && cmdName) ? cmds[cmdName] : null;

		if (!fn) {
			throw new Error(`comamnd ${argv._} unknown`);
		}

		// remove the "routing commands" so that the command fn get the specialize context
		const fnArgv = { ...argv }; // shallow copy
		fnArgv._ = fnArgv._.slice(2); // new array
		await fn(fnArgv);

	} catch (ex) {
		console.log(`${ex}`);
	}

}






