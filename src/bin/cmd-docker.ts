import { ParsedArgs } from 'minimist';
import { asNames, assertRealm, buildDockerImage, getCurrentRealm, loadDockerBlocks, push, updateVersions } from '../main';
import { hasSessionState } from '../session';
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
			await buildDockerImage(dockerBlock);
			console.log();
		}
	}
	if (hasSessionState('NO_LOCAL_REGISTRY')) {
		if (realm.type === 'local') {
			console.log('\n\nWARNING - No Local Registry (http://localhost:5000/) - Images were not pushed to local registry');
			console.log(`\t  Will NOT be able to deploy to local kubernetes (e.g., 'npm run vdev kcreate' will fail)`);
			console.log(`\n\tTips:\n\t   Start local docker registry: 'docker run -d -p 5000:5000 --restart=unless-stopped --name registry registry'`);
			console.log(`\t   Re-run dbuild: 'npm run vdev dbuild'\n\n`);
		}
	}
}
// --------- /Docker CMDs --------- //
