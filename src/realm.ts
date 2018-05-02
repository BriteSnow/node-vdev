
import { saferRemove, asNames } from './utils';
import { getCurrentProject, setCurrentProject } from './gcloud';
import { getCurrentContext, setCurrentContext } from './k8s';
import { loadVdevConfig } from './vdev-config';
import { userInfo } from 'os';

import * as fs from 'fs-extra-plus';
import * as path from 'path';
import * as handlebars from 'handlebars';


// --------- Public Types --------- //
export interface Realm {

	// This is the "app name" the global name for the application (containing multiple servives)
	systemName: string;

	name: string;

	/** The Kubernetes context name (this is required) */
	context: string;

	/** The Google project name */
	project?: string;

	[key: string]: any;
}

export type RealmByName = { [name: string]: Realm };

export type RealmChange = { projectChanged?: boolean, contextChanged?: boolean };
// --------- /Public Types --------- //

// --------- Public Realms APIs --------- //
/**
 * Set/Change the current ersult (k8s context and eventual google project). Only change what is needed. 
 * @param {*} realm the realm object.
 * @return {projectChanged?: true, contextChanged?: true} return a change object with what has changed.
 */
export async function setRealm(realm: Realm) {
	const currentRealm = await getCurrentRealm();
	const change: RealmChange = {};

	// NOTE: When realm.project is undefined, it will set the gclougProject to undefined, 
	//       which is fine since we want to avoid accidental operation to the project.
	// FIXME: Needs to handle the case where realm.project is not defined (probably remove the current google project to make sure no side effect)
	if (realm.project && (!currentRealm || currentRealm.project !== realm.project)) {
		change.projectChanged = true;
		await setCurrentProject(realm.project);
	}

	if (!currentRealm || currentRealm.context !== realm.context) {
		change.contextChanged = true;
		await setCurrentContext(realm.context);
	}

	return change;
}

/**
 * Get the current Realm. Return undefined if not found
 */
export async function getCurrentRealm() {
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

	if (realm && realm.project) {
		const project = await getCurrentProject();
		if (realm.project !== project) {
			throw new Error(`Realm ${realm.name} with Context ${context} should have project ${realm.project} but has ${project}
				Do a 'npm realm ${realm.name}' to make sure all is set correctly`);
		}
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

	const srcYamlFile = getKFile(realm, name);
	const srcYamlFileName = path.parse(srcYamlFile).base;
	const srcYamlContent = await fs.readFile(srcYamlFile, 'utf8');

	const outYamlFile = path.join(realmOutDir, srcYamlFileName);

	// render the content
	var data = realm;
	const outYamlContent = await hbsRender(srcYamlContent, data);

	// for now, we do not generate do any template
	await fs.ensureDir(realmOutDir);
	await fs.writeFile(outYamlFile, outYamlContent);

	return outYamlFile;
}



export function formatAsTable(realms: RealmByName, currentRealm?: Realm | null) {
	const txts = [];
	const header = '  ' + 'REALM'.padEnd(20) + 'CONTEXT'.padEnd(60) + 'PROJECT';
	txts.push(header);

	const currentRealmName = (currentRealm) ? currentRealm.name : null;
	const currentProject = (currentRealm) ? currentRealm.project : null;
	for (let realm of Object.values(realms)) {
		let row = (realm.name === currentRealmName) ? "* " : "  ";
		row += realm.name.padEnd(20) + (realm.context ? realm.context : 'NO CONTEXT FOUND').padEnd(60);
		if (realm.project) {
			const str = realm.project + ((realm.project === currentProject) ? ' *' : '');
			row += str;
		}
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
	const names = await getResourceNames(realm, resourceNames);
	const result: TemplateRendered[] = [];

	for (let name of names) {
		const path = await renderRealmFile(realm, name);
		result.push({ name, path });
	}
	return result;
}
// --------- /Resource Management --------- //

/**
 * Returns a list of resource names for a given realm and optional resource name comma delimited string or array.
 * - If resourceNames is an array, then, just return as is. 
 * - If resourceNames is string (e.g., 'web-server, queue') then it will split on ',' and trim each item as returns.
 * - If no resourceNames then returns all of the resourceNames for the realm.
 */
export async function getResourceNames(realm: Realm, resourceNames?: string | string[]) {
	if (resourceNames) {
		return asNames(resourceNames);
	} else {
		return getAllResourceNames(realm);
	}
}

export function getLocalImageName(realm: Realm, serviceName: string) {
	return "localhost:5000/" + realm.system + '-' + serviceName;
}

/**
 * Note: right now assume remote is on gke cloud (gcr.io/)
 * @param realm 
 * @param serviceName 
 */
export function getRemoteImageName(realm: Realm, serviceName: string) {
	return `gcr.io/${realm.project}/${realm.system}-${serviceName}`;
}

export function assertRealm(realm?: Realm): Realm {
	if (!realm) {
		throw new Error(`No realm found, do a 'npm run realm' to see the list of realm, and 'npm run realm realm_name' to set a realm`);
	}
	return realm;
}


// --------- Loader --------- //
export async function loadRealms(): Promise<RealmByName> {
	const rawConfig = await loadVdevConfig();

	const rawRealms: { [name: string]: any } = rawConfig.realms;
	const realms: RealmByName = {};

	const base = {
		system: rawConfig.system,
		k8sDir: rawConfig.k8sDir
	}
	// get the eventual _common object out of the 
	let _common = {};
	if (rawRealms._common) {
		_common = rawRealms._common;
		delete rawRealms._common;
	}

	// great the realm object
	for (let name in rawRealms) {
		const rawRealm = rawRealms[name];

		// TODO: must do a deep merge
		const realm = { ...base, ..._common, ...rawRealm };

		realm.name = name;
		realms[name] = realm;
	}
	return realms;
}
// --------- /Loader --------- //


// --------- Private Helpers --------- //
/** Get all of the resourceNames for a given realm */
async function getAllResourceNames(realm: Realm): Promise<string[]> {
	const dir = getRealmSrcDir(realm);
	const yamlFiles = await fs.listFiles(dir, '.yaml');

	// return the list of names only
	if (yamlFiles) {
		return yamlFiles.map((f: string) => { return path.basename(f, '.yaml') });
	} else {
		return []; // return empty list if nothing found
	}
}

function getRealmOutDir(realm: Realm) {
	return path.join(realm.k8sDir, '~out/', realm.name + '/');
}

function getRealmSrcDir(realm: Realm) {
	return path.join(realm.k8sDir, realm.yamlDir);
}

// get the Original Kubernets Yaml file (which could be a template)
function getKFile(realm: Realm, kName: string) {
	let k8sDir = getRealmSrcDir(realm);
	return path.join(k8sDir, `${kName.trim()}.yaml`);
}

async function cleanRealmOutDir(realm: Realm) {
	await saferRemove(getRealmOutDir(realm));
}
// --------- /Private Helpers --------- //


// --------- Private Handlebars Renderer --------- //


async function hbsRender(templateString: string, data: any) {
	const hbs = getHandlebars();
	const tmpl = handlebars.compile(templateString, { noEscape: true });
	const outContent = tmpl(data);
	return outContent;
}

let _handlebars: typeof Handlebars | null = null;


// return the Handlebars initialized
function getHandlebars() {
	if (_handlebars) {
		return _handlebars;
	}

	// --------- Handlebars Helpers --------- //

	// encode64
	handlebars.registerHelper('encode64', function (this: any, arg1: any, arg2: any) {
		let val: string;
		let opts: any;
		// if we do not have two args, then, it is a regular helper
		if (arg2 === undefined) {
			opts = arg1;
			val = opts.fn(this);
		}
		// if we have two args, then, the first is the value
		else {
			val = arg1 as string;
			opts = arg2;
		}
		const b64 = Buffer.from(val).toString('base64');
		return b64;
	});

	handlebars.registerHelper('username', function () {
		const username = userInfo().username;
		return username;
	});

	// --------- /Handlebars Helpers --------- //

	_handlebars = handlebars;
	return _handlebars;
}


// --------- /Private Handlebars Renderer --------- //

