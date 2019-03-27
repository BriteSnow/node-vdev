import { ParsedArgs } from 'minimist';
import { asNames, assertRealm, buildDockerImage, getCurrentRealm, loadDockerBlocks, push, updateVersions } from '../main';
import { CmdMap } from '../utils';

export const cmds: CmdMap = {
	dpush, dbuild
}

// --------- Docker CMDs --------- //
// push the docker image to the remote cloud (today, gcloud)
async function dpush(argv: ParsedArgs) {
	const servicesStr = argv._[0];
	const realm = assertRealm(await getCurrentRealm());
	await push(realm, servicesStr);
}

async function dbuild(argv: ParsedArgs) {
	const blockStr = argv._[0];

	// update the version
	await updateVersions();

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
// --------- /Docker CMDs --------- //
