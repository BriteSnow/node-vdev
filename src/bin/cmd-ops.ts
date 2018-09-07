import { Realm, loadRealms, getCurrentRealm, assertRealm, setRealm, formatAsTable, templatize } from '../main';
import { kcreate as _kcreate, kapply as _kapply, kexec as _kexec, kdel, kshRestart, klogs as _klogs } from '../main';
import { push } from '../main';
import { psqlImport } from '../main';
import * as fs from 'fs-extra-plus';
import { ParsedArgs } from 'minimist';
import { CmdMap } from '../utils';


export const cmds: CmdMap = {
	realm, ktemplate, kexec, kcreate, kapply, kdelete, krestart, klogs, gpush, recreateDb
}

// --------- Realm CMDs --------- //
// set/get/list realm
async function realm(argv: ParsedArgs) {
	const name = argv._[0];
	const currentRealm = await getCurrentRealm();
	const realms = await loadRealms();

	if (!currentRealm) {
		console.log(`No current realm found.`);
	}

	console.log(formatAsTable(realms, currentRealm));

	if (name) {

		if (currentRealm) {
			console.log(`\nChanging realm from ${currentRealm.name} to ${name}`);
		} else {
			console.log(`\nSetting realm ${name}`);
		}

		const realm = realms[name];
		if (!realm) {
			console.log(`Realm with name ${name} not found, cannot change to it. Do nothing.`);
			return;
		}

		await setRealm(realm);

		console.log(`DONE - Realm Changed to ${realm.name}\n`);

		const newCurrentRealm = await getCurrentRealm();
		console.log(formatAsTable(realms, newCurrentRealm));
	}
}
// --------- /Realm CMDs --------- //

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

async function kexec(argv: ParsedArgs) {
	const resourcesStr = argv._[0];
	const args = argv._.slice(1);

	// add the eventual extra arguments (after --) to the list so that it can be pass to the exec
	// This allow to do a `npm run kexec web-server -- npm test -- -g test-hello` 
	const extraArgs = argv['--'];
	if (extraArgs && extraArgs.length > 0) {
		args.push('--');
		args.push(...extraArgs);
	}

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


// --------- GKE CMDs --------- //
// push the docker image to the remote cloud (today, gcloud)
async function gpush(argv: ParsedArgs) {
	const servicesStr = argv._[0];
	const realm = assertRealm(await getCurrentRealm());
	await push(realm, servicesStr);
}
// --------- /GKE CMDs --------- //

// --------- Database --------- //
const sqlDir = './sql';

/**
 * Convention and order of execution is: 
 * 	- sql files starting with '0' will be ran a postgres users
 *  - sql files starting with '1' will be ran a dbPrefix_user on dbPrefix_db
 *  - sql files starting with 'drop-' will be ran a dbPrefix_user on dbPrefix_db
 * @param argv 
 */
async function recreateDb(argv: ParsedArgs) {
	const host = argv._[0] || "localhost";

	const realm = assertRealm(await getCurrentRealm());
	const dbPrefix = realm.system + '_';

	await psqlImport({ user: "postgres", db: "postgres", host: host }, await fs.glob('0*.sql', sqlDir));
	await psqlImport({ user: dbPrefix + "user", db: dbPrefix + "db", host: host }, await fs.glob('1*.sql', sqlDir));
	await psqlImport({ user: dbPrefix + "user", db: dbPrefix + "db", host: host }, await fs.glob('drop-*.sql', sqlDir));
}
// --------- /Database --------- //