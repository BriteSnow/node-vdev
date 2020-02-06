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

// const args = ['login', '-u', 'AWS', '-p',
// 	"eyJwYXlsb2FkIjoiSGNQSXUyWEFRaE9KaU1NVGtzTGRKZXdibVJnSGdULy9KbmxCdDF1bUVySlFiUGpuY0ZYMWRHazg2YU4vU1hpTGg3c2tmeURoSkRlUzRHS3NSYi8yYnk1MXNnRkJieW1vVExrVkdvMS9ycXk2bURyMGxUUXVnNlNkb0ZsN2I5ZVdBZjlYdjdFN0ZSVjBQME56UEFteWloVmQ3Si8zNWJNU1k1ZGw5dHZ2U2sxeEd6Y3JUUGRZN0RxK0lwQVA2TXZjYjFUT1BORDc0OXdjN1UzcWw2Zkd2Y2htVkZPdzZDa2NuVlNsOHJqUTJRU3orRUdnMDl3K1FQL0hteGhEY1A4UXhmL0l2SnM5QXVDRkhpMWN5bWpCdXZxUlE0SWtPKzYvbDJadS9CN1BNNDZqeU0wM3NIQzBsVGRNdktpVFhzSFpOQ0RSU1AyQ3hFT0x1T3pFcHpjTnZaUUhBZXpHdzQvRy8zQjVINFZ1bG5iY1pPaklkZVEyeklkbXBvcW9WZmNoMVJaL2MxOHJFbnhKaVcwM0pudTRIMElLSXVzaksvaytCdU9PZVlNSnRHUmpDK1NFWWk0ajBZMDhOZ1I4cVp4bktIdFBwSkUrVm9jTVJmdCtub3lLQklac0JJdTZtQ2srTTc1ZnVYeEp1V01ZL3pQY1dlcUdFbnZTWVRPbzRsd0RzRmlocEE3WmVsQjdGS1d0Y01Za2JBU1Z6d1JIUDlkM1dBRGhVMXBMcm1hM1VmUnFZVmtXdkNVaVF2QU5wbUZhVG9iWkJzeU9UUkFLaVM4cWV5ZUdtZnJyK3lUUGNVNW93REdnRWduMHdFbENnTDd6bkR1OTdMWjhvVUVZZkROd2FvdnJacEtWbUpJVW5UVWNMdml0eTFVa2tNSHhPNDBDRnRSckc3Y0hSbXovc0VhMjFOeDhpbTRlbVpKSUdNUzI1TUw1YWRqQ1ZOMXRDUVFRWUVTUWVqSzdXUkt3YmgvSWVGSXE3RjJDeVdUNllJU3BmTGYrbG5RR1pReXVOTlovbUtLNzRDOGJacDN5b3pVRUhoMWJPTy9UK2htQVp5Z1pTdmFBVnJkbTJ6OS9mcXpldWcxbzFhZGRwbG9sbDJMMlZZVFJBbklCcHhBQjlRQ0d4MDRsU3dyajJmL25Xc0JOT0xyR3BDZytJYnZpRlRWUzBxK2dLcU1rOWV4K1ZldGVKbXhWTjVZbm9TK1pxZHdGUmk5bkcxeW5QSVkwMWl4TnNRbzgxZ3BHNWJCclFqK0RwUEVxMnNrN2dlOUwzejNlWGRkaWdxcyt6eG5oUUNsdStJOEk4YjRiTEJEQmZTclBNUU0rSnpZblpGZ0hCUFF6NVBKU2U5d0syMGtFNk9KMzk0QVZmN0NHRGRjVThTc0JJanhoL2hyZ2tvMmlxZG9vQ3ZncTFKNnlROVdSY09RSXBORTg4VVBXZExvamZNcFBCZ0hnVVl4aVlPMHBMY2RqUVFaY0dNdGJwT29aSnc9PSIsImRhdGFrZXkiOiJBUUVCQUhqNmxjNFhJSncvN2xuMEhjMDBETWVrNkdFeEhDYlk0UklwVE1DSTU4SW5Vd0FBQUg0d2ZBWUpLb1pJaHZjTkFRY0dvRzh3YlFJQkFEQm9CZ2txaGtpRzl3MEJCd0V3SGdZSllJWklBV1VEQkFFdU1CRUVET2x2cmtCYi9VbFJQOE1HOEFJQkVJQTdkcEtMYlBMZHcvWS94MGR2aWV1cXFKc2c5Ni9aNnR6ZnBhdEozOUxka0d6VXgrMHF2cnYyajJUN2I4bC9MWW5ZaURIUExNVFVIMjBJR1A0PSIsInZlcnNpb24iOiIyIiwidHlwZSI6IkRBVEFfS0VZIiwiZXhwaXJhdGlvbiI6MTU2MDE2NjYyNn0=", 'https://349642121055.dkr.ecr.us-west-2.amazonaws.com']

export async function dpush_image_ex(realm: Realm, ex: any, remoteImage: string) {
	console.log(`dpush - recovering - first docker dpush to ${remoteImage} failed, trying to recover`);
	// aws ecr get-login --no-include-email
	const reloginCmd = await spawn('aws', ['ecr', 'get-login', '--no-include-email', '--profile', realm.profile], { capture: 'stdout' });
	const reloginArg = reloginCmd.stdout.trim().split(' ');
	reloginArg.shift(); // remove the 'docker' first item.
	try {
		const relogin = await spawn('docker', reloginArg, { capture: 'stdout' });
		console.log('dpush - relogin success');
		console.log(`dpush - trying to push again ${remoteImage}`);
		await spawn('docker', ['push', remoteImage]);
		console.log('dpush - fully recovered');
	} catch (ex2) {
		console.log('dpush - error - relogin/repush failed', ex2);
		throw ex2;
	}
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
	const repositories = JSON.parse(dataStr.stdout.trim()).repositories;
	if (repositories) {
		return repositories.map((r: any) => r.repositoryName);
	} else {
		return [];
	}
}
//#endregion ---------- /Utils ----------