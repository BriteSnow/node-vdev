import { Realm, getRepositoryName } from './main';
import { spawn } from 'p-spawn';


//#region    ---------- Hook Functions ---------- 
// finish initializing a realm object
export async function realm_init(realm: Realm) {
	// a aws realm must have a profile. Default is 'default'
	if (!realm.profile) {
		realm.profile = 'default';
	}
}

export async function dpush_prep(realm: Realm, serviceNames: []) {
	const repoNames = serviceNames.map(sn => { return getRepositoryName(realm, sn) });

	const existingRepositoryNames = await getRepositoryNames(realm);
	const missingRepositoryNames = repoNames.filter(n => !existingRepositoryNames.includes(n));
	await createRepositories(realm, missingRepositoryNames);
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

async function getRepositoryNames(realm: Realm) {

	// TODO: This is a good place to try/catch and try to handle the case wheren loging needs to be performed again. 
	//        $(aws ecr get-login --no-include-email --profile default)

	const dataStr = await spawn('aws', ['ecr', 'describe-repositories', '--profile', realm.profile], { capture: 'stdout' });
	const repositories = JSON.parse(dataStr.stdout.trim()).repositories;
	if (repositories) {
		return repositories.map((r: any) => r.repositoryName);
	} else {
		return [];
	}
}
//#endregion ---------- /Utils ----------