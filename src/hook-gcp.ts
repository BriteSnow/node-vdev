import { getCurrentProject, Realm, setCurrentProject } from './main';


//#region    ---------- Hook Functions ---------- 
export async function realm_check(realm: Realm) {

	const project = await getCurrentProject();

	if (realm.project !== project) {
		throw new Error(`Realm ${realm.name} with Context ${realm.context} should have project ${realm.project} but has ${project}
	Do a 'npm run vdev realm ${realm.name}' to make sure all is set correctly`);
	}
}

export async function realm_set_begin(realm: Realm, currentRealm?: Realm) {
	const project = await getCurrentProject();

	if (realm.project && realm.project !== project) {
		await setCurrentProject(realm.project);
		return true;
	}
	return false;
}
//#endregion ---------- /Hook Functions ----------