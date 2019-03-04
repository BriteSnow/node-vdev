import { homedir } from 'os';
import { parsePathInfo, list, copy, download, upload } from '../main';
import { ParsedArgs } from 'minimist';
import { CmdMap } from '../utils';



export const cmds: CmdMap = {
	ls, cp, down, up
}

// --------- Commands --------- //
async function ls(argv: ParsedArgs) {
	const pathInfoStr = argv._[0];
	if (!pathInfoStr) {
		throw new Error(`comman 'ls' must have a path to list`);
	}

	const files = await list(parsePathInfo(pathInfoStr));

	const maxNameLength = maxPropLength(files, 'name');

	files.forEach((f) => {
		const dispName = f.name.padEnd(maxNameLength + 5);
		const size: number = f.size;
		console.log(`${dispName} ${formatSize(size)}`);
	});
}

async function cp(argv: ParsedArgs) {
	const fromPathInfo = argv._[0];
	const toPathInfo = argv._[1];
	if (!fromPathInfo || !toPathInfo) {
		throw new Error(`command 'cp' must have a fromPath and toPath`);
	}
	const files = await copy(parsePathInfo(fromPathInfo), parsePathInfo(toPathInfo));

}

async function down(argv: ParsedArgs) {
	const pathInfoStr = argv._[0];
	if (!pathInfoStr) {
		throw new Error(`comman 'down' must have a remote path to download`);
	}

	// TODO: need to support give a destination
	const destDir = `${homedir()}/Downloads/`;

	await download(parsePathInfo(pathInfoStr), destDir);
}

async function up(argv: ParsedArgs) {
	const file = argv._[0];
	const pathInfoStr = argv._[1];
	if (!file || !pathInfoStr) {
		throw new Error(`command 'up' must have a local file and destination path`);
	}

	const r = await upload(file, parsePathInfo(pathInfoStr));
}


// --------- /Commands --------- //

const units: { [name: string]: number } = { Gb: 3, Mb: 2 }


// Format a size in bytes in readable Mb or Gb
function formatSize(size: number) {
	let l = 1000;
	let name = 'Kb';
	for (name in units) {
		l = Math.pow(1000, units[name]);
		if (size > l) {
			break;
		}
	}
	const relSize = Math.round(size * 10 / l) / 10;

	return `${relSize} ${name}`;
}

function maxPropLength(items: any, name: string) {
	let m = -1;
	for (let item of items) {
		const val = item[name];
		if (val != null && val.length != null && val.length > m) {
			m = val.length;
		}
	}
	return m;
}
