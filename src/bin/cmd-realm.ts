import { ParsedArgs } from 'minimist';
import { formatAsTable, getCurrentRealm, loadRealms, setRealm } from '../main';
import { CmdMap } from '../utils';


export const cmds: CmdMap = {
	realm
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
