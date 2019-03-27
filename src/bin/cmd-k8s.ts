import { ParsedArgs } from 'minimist';
import { assertRealm, formatAsTable, getCurrentRealm, kapply as _kapply, kcreate as _kcreate, kdel, kexec as _kexec, klogs as _klogs, kshRestart, loadRealms, setRealm, templatize } from '../main';
import { CmdMap } from '../utils';


export const cmds: CmdMap = {
	ktemplate, kexec, kcreate, kapply, kdelete, krestart, klogs
}

// --------- K8s CMDs --------- //
// templatize one, or more, or all yaml realm resources
async function ktemplate(argv: ParsedArgs) {
	const resourcesStr = argv._[0];

	const realm = assertRealm(await getCurrentRealm());
	const result = await templatize(realm, resourcesStr);
	for (let item of result) {
		console.log(`Templatize resource '${item.name}' to '${item.path}'`);
	}
}

async function kexec(argv: ParsedArgs, rawArgv: string[]) {
	const resourcesStr = rawArgv[0];
	const args = rawArgv.slice(1);

	const realm = assertRealm(await getCurrentRealm());
	await _kexec(realm, resourcesStr, args);
}


async function kcreate(argv: ParsedArgs) {
	const resourcesStr = argv._[0];

	const realm = assertRealm(await getCurrentRealm());
	await _kcreate(realm, resourcesStr);
}

async function kapply(argv: ParsedArgs) {
	const resourcesStr = argv._[0];

	const realm = assertRealm(await getCurrentRealm());
	await _kapply(realm, resourcesStr);
}

async function kdelete(argv: ParsedArgs) {
	const resourcesStr = argv._[0];

	const realm = assertRealm(await getCurrentRealm());
	await kdel(realm, resourcesStr);
}

async function krestart(argv: ParsedArgs) {
	const resourcesStr = argv._[0];

	const realm = assertRealm(await getCurrentRealm());
	// for now, only support one
	if (!resourcesStr) {
		console.log('Nothing to restart. Do nothing.');
		return;
	}
	await kshRestart(realm, resourcesStr);
}

async function klogs(argv: ParsedArgs) {
	const resourcesStr = argv._[0];

	const realm = assertRealm(await getCurrentRealm());
	_klogs(realm, resourcesStr);
}
// --------- /K8s CMDs --------- //