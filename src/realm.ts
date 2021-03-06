import { glob, saferRemove } from 'backlib';
import * as fs from 'fs-extra';
import * as Path from 'path';
import { asArray } from 'utils-min';
import { BaseObj } from './base';
import { Block } from './block';
import { _getImageName } from './docker';
import { callHook } from './hook';
import { getCurrentContext, setCurrentContext } from './k8s';
import { render } from './renderer';
import { asNames } from './utils';
import { loadVdevConfig } from './vdev-config';


// --------- Public Types --------- //
export type RealmType = 'local' | 'gcp' | 'aws' | 'azure';
export interface Realm extends BaseObj {

	/** Path to the yaml directory(ies) relative to main vdev.yaml. If array, first take precedence and is the one used for the .out output result   */
	yamlDirs: string[];

	name: string;

	/** The Kubernetes context name (this is required) */
	context: string | null;

	type: RealmType;

	/** The Google project name */
	project?: string;

	/** 
	 * The for type 'local' it's localhost:5000/, for 'gcr.io/${realm.project}/' for aws, has to be set.
	 * 
	 */
	registry: string;

	/** list of default defaultConfigurations (k8s yaml file names without extension) to be used if "kcreate, ..." has not services description */
	defaultConfigurations?: string[];

	[key: string]: any;
}

export type RealmByName = { [name: string]: Realm };

export type RealmChange = { profileChanged?: boolean, contextChanged?: boolean };
// --------- /Public Types --------- //

// --------- Public Realms APIs --------- //
/**
 * Set/Change the current (k8s context and eventual google project). Only change what is needed. 
 * @param {*} realm the realm object.
 * @return {profileChanged?: true, contextChanged?: true} return a change object with what has changed.
 */
export async function setRealm(realm: Realm) {
	const currentRealm = await getCurrentRealm(false);
	const change: RealmChange = {};

	// NOTE: When realm.project is undefined, it will set the gclougProject to undefined, 
	//       which is fine since we want to avoid accidental operation to the project.
	// FIXME: Needs to handle the case where realm.project is not defined (probably remove the current google project to make sure no side effect)
	const hookReturn = await callHook(realm, 'realm_set_begin', currentRealm);

	if (hookReturn != null) {
		change.profileChanged = true;
	}

	if (realm.context === null) {
		console.log(`INFO: realm ${realm.name} does not have a kubernetes context, skipping 'kubectl config use-context ...' (current kubectl context still active)`);
	} else if (!currentRealm || currentRealm.context !== realm.context) {
		change.contextChanged = true;
		await setCurrentContext(realm.context);
	}


	return change;
}

/**
 * Get the current Realm. Return undefined if not found
 */
export async function getCurrentRealm(check = true) {
	const realms = await loadRealms();
	const context = await getCurrentContext();

	let realm;

	for (let realmName in realms) {
		let realmItem = realms[realmName];
		if (realmItem.context === context) {
			realm = realmItem;
			break;
		}
	}

	if (check && realm) {
		await callHook(realm, 'realm_check');
	}

	// if no context matching, try get the first realm that has no context
	if (!realm) {
		realm = Object.values(realms).find(r => r.context === null);
	}

	return realm;
}



/**
 * Render realm yaml file.
 * @param realm 
 * @param name name of the yaml file (without extension)
 * @return The yaml file path
 */
export async function renderRealmFile(realm: Realm, name: string): Promise<string> {
	const realmOutDir = getRealmOutDir(realm);

	const srcYamlFile = await findKFile(realm, name);
	const srcYamlFileName = Path.parse(srcYamlFile).base;
	const srcYamlContent = await fs.readFile(srcYamlFile, 'utf8');

	const outYamlFile = Path.join(realmOutDir, srcYamlFileName);

	// render the content
	var data = realm;
	const outYamlContent = await render(srcYamlContent, data);

	// for now, we do not generate do any template
	await fs.ensureDir(realmOutDir);
	await fs.writeFile(outYamlFile, outYamlContent);

	return outYamlFile;
}



export function formatAsTable(realms: RealmByName, currentRealm?: Realm | null) {
	const txts = [];
	const header = '  ' + 'REALM'.padEnd(20) + 'TYPE'.padEnd(12) + 'PROJECT/PROFILE'.padEnd(20) + 'CONTEXT';
	txts.push(header);

	const currentRealmName = (currentRealm) ? currentRealm.name : null;
	const currentProject = (currentRealm) ? currentRealm.project : null;
	for (let realm of Object.values(realms)) {
		let row = (realm.name === currentRealmName) ? "* " : "  ";
		row += realm.name.padEnd(20);
		row += realm.type.padEnd(12);
		let profile = (realm.type === 'gcp') ? realm.project : realm.profile;
		profile = (profile == null) ? '' : profile;
		row += profile.padEnd(20);
		row += (realm.context ? realm.context : 'NO CONTEXT FOUND');
		txts.push(row);
	}
	return txts.join('\n');
}
// --------- /Public Realms APIs --------- //


// --------- Resource Management --------- //
export type TemplateRendered = { name: string, path: string };

/**
 * Templatize a set of yaml files
 * @param resourceNames either a single name, comma deliminated set of names, or an array.
 */
export async function templatize(realm: Realm, resourceNames?: string | string[]): Promise<TemplateRendered[]> {
	const names = await getConfigurationNames(realm, resourceNames);
	const result: TemplateRendered[] = [];

	for (let name of names) {
		const path = await renderRealmFile(realm, name);
		result.push({ name, path });
	}
	return result;
}
// --------- /Resource Management --------- //

/**
 * Returns a list of k8s configuration file names for a given realm and optional configurations names delimited string or array.
 * - If configurationNames is an array, then, just return as is.
 * - If configurationNames is string (e.g., 'web-server, queue') then it will split on ',' and trim each item as returns.
 * - If no resourceNames then returns all of the resourceNames for the realm.
 */
export async function getConfigurationNames(realm: Realm, configurationNames?: string | string[]) {

	// Note: for now, we do the check if the realm has a context here, because this is called for each k*** commands
	// TODO: Might want to make it more explicit, as validateRealmForKubectlCommand(realm)
	if (realm.context === null) {
		throw Error(`Realm '${realm.name}' does not have a Kubernetes context, cannot perform kubectly commands.`);
	}

	if (configurationNames) {
		return asNames(configurationNames);
	} else if (realm.defaultConfigurations) {
		return realm.defaultConfigurations;
	} else {
		return getAllConfigurationNames(realm);
	}
}


/**
 * Note: right now assume remote is on gke cloud (gcr.io/)
 * @param realm 
 * @param serviceName 
 */
export function getRemoteImageName(block: Block, realm: Realm) {
	return _getImageName(block, realm.registry);
}


export function assertRealm(realm?: Realm): Realm {
	if (!realm) {
		throw new Error(`No realm found, do a 'npm run realm' to see the list of realm, and 'npm run realm realm_name' to set a realm`);
	}
	return realm;
}


// --------- Loader --------- //
export async function loadRealms(rootDir?: string): Promise<RealmByName> {
	const rawConfig = await loadVdevConfig(rootDir);

	const rawRealms: { [name: string]: any } = rawConfig.realms;
	const realms: RealmByName = {};

	const base = {
		system: rawConfig.system,
	}
	// get the _common variables and delete it from the realm list
	let _common = {};
	if (rawRealms._common) {
		_common = rawRealms._common;
		delete rawRealms._common;
	}

	// Create the realm object
	for (let name in rawRealms) {
		const rawRealm = rawRealms[name];

		// TODO: must do a deep merge
		const realm = { ...base, ..._common, ...rawRealm };

		// NOTE: this is needed in realm, because ktemplate does not know if the k8s yaml is related to which block
		// TODO: need to throw error if realm have a imageTag override
		realm.imageTag = rawConfig.imageTag;

		//// determine the type
		let type: RealmType = 'local';
		const context: undefined | string = realm.context;
		if (context) {
			if (context.startsWith('arn:aws')) {
				type = 'aws';
				realm.profile = (realm.profile != null) ? realm.profile : 'default';
			} else if (context.startsWith('gke')) {
				type = 'gcp';
			} else if (realm.registry && realm.registry.includes('azurecr')) {
				type = 'azure';
			}
		} else {
			realm.context = null;
		}
		realm.type = type;

		//// determine registry
		if (!realm.registry) {
			if (type === 'local' && realm.context) { // do not create localhost registry for local realm without context
				realm.registry = 'localhost:5000/';
			} else if (type === 'gcp') {
				realm.registry = `gcr.io/${realm.project}/`;
			} else if (type === 'aws') {
				console.log(`WARNING - realm ${realm.name} of type 'aws' must have a registry property in the vdev.yaml`);
			}
		}

		// set the name
		realm.name = name;

		// set the yamlDirs from yamlDir
		realm.yamlDirs = realm.yamlDirs ?? asArray(realm.yamlDir);

		// Call hook to finish initializing the realm (i.e., realm type specific initialization)
		// TODO: not sure this is the right place to init the current realm. This is loading the realm. 
		await callHook(realm, 'realm_init');

		realms[name] = realm;
	}
	return realms;
}
// --------- /Loader --------- //


// --------- Private Helpers --------- //
/** Get all of the resourceNames for a given realm */
async function getAllConfigurationNames(realm: Realm): Promise<string[]> {

	const nameSet = new Set<string>();

	for (const yamlDir of realm.yamlDirs) {
		const yamlFiles = await glob('*.yaml', yamlDir);
		yamlFiles.forEach(file => { nameSet.add(Path.basename(file, '.yaml')) })
	}

	return Array.from(nameSet);
}

function getRealmOutDir(realm: Realm) {
	return Path.join(realm.yamlDirs[0], '.out/', realm.name + '/');
}



// get the Original Kubernets Yaml file (which could be a template)
async function findKFile(realm: Realm, kName: string) {
	const fileName = `${kName.trim()}.yaml`;
	for (const yamlDir of realm.yamlDirs) {
		const file = Path.join(yamlDir, fileName);
		if (await fs.pathExists(file)) {
			return file;
		}
	}

	throw new Error(`Kubernetes resource file ${fileName} not found in directories ${realm.yamlDirs.join(', ')}`);
}

async function cleanRealmOutDir(realm: Realm) {
	await saferRemove(getRealmOutDir(realm));
}
// --------- /Private Helpers --------- //









