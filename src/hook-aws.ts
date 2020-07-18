import { spawn } from 'p-spawn';
import { loadBlocks } from './block';
import { getRepositoryName, Realm } from './main';


//#region    ---------- Hook Functions ---------- 
// finish initializing a realm object
export async function realm_init(realm: Realm) {
	// a aws realm must have a profile. Default is 'default'
	if (!realm.profile) {
		realm.profile = 'default';
	}
}

export async function dpush_prep(realm: Realm, serviceNames: string[]) {
	const blockByName = await loadBlocks();

	const repoNames = serviceNames.map(sn => getRepositoryName(blockByName[sn]));

	const existingRepositoryNames = await getAwsExistingRepositoryNames(realm);
	const missingRepositoryNames = repoNames.filter(n => !existingRepositoryNames.includes(n));
	await createRepositories(realm, missingRepositoryNames);
}


export async function dpush_image_ex(realm: Realm, ex: any, remoteImage: string) {
	console.log(`dpush - recovering - first docker dpush to ${remoteImage} failed, trying to recover`);

	// AWS CLI 2
	try {
		// get ecr password
		const cmdGetPwd = await spawn('aws', ['ecr', 'get-login-password', '--profile', realm.profile], { capture: 'stdout' });
		const pwd = cmdGetPwd.stdout!.trim();

		// docker login (leave output to console)
		const cmdDockerLogin = await spawn('docker', ['login', '--username', 'AWS', '--password-stdin', realm.registry], { input: pwd });
		console.log('dpush - relogin success');
		console.log(`dpush - trying to push again ${remoteImage}`);
		await spawn('docker', ['push', remoteImage]);
		console.log('dpush - fully recovered');
	} catch (ex) {
		console.log('dpush - error - relogin/repush failed', ex);
		throw ex;
	}

	// AWS CLI 1.x
	// aws ecr get-login --no-include-email
	// const reloginCmd = await spawn('aws', ['ecr', 'get-login', '--no-include-email', '--profile', realm.profile], { capture: 'stdout' });
	// const reloginArg = reloginCmd.stdout!.trim().split(' ');
	// reloginArg.shift(); // remove the 'docker' first item.
	// try {
	// 	const relogin = await spawn('docker', reloginArg, { capture: 'stdout' });
	// 	console.log('dpush - relogin success');
	// 	console.log(`dpush - trying to push again ${remoteImage}`);
	// 	await spawn('docker', ['push', remoteImage]);
	// 	console.log('dpush - fully recovered');
	// } catch (ex2) {
	// 	console.log('dpush - error - relogin/repush failed', ex2);
	// 	throw ex2;
	// }
	return true;
}
//#endregion ---------- /Hook Functions ---------- 


//#region    ---------- Utils ---------- 
async function createRepositories(realm: Realm, repoNames: string[]) {
	for (const repo of repoNames) {
		// aws ecr create-repository --profile default --repository-name cstar-agent
		console.log(`Info - aws ECR repository ${repo} does not exist, creating...`);
		await spawn('aws', ['ecr', 'create-repository', '--profile', realm.profile, '--repository-name', repo]);
	}
}

async function getAwsExistingRepositoryNames(realm: Realm) {

	// NOTE: Somehow even when the login has expired, this call works (it's the push that does not work)
	const dataStr = await spawn('aws', ['ecr', 'describe-repositories', '--profile', realm.profile], { capture: 'stdout' });
	const repositories = JSON.parse(dataStr.stdout!.trim()).repositories;
	if (repositories) {
		return repositories.map((r: any) => r.repositoryName);
	} else {
		return [];
	}
}
//#endregion ---------- /Utils ----------