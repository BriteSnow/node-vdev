
import * as fs from 'fs-extra';
import * as Path from 'path';
import { loadTemplatizedYaml } from './renderer';
import deepmerge = require('deepmerge');


// --------- Public Types --------- //
export interface RawVdevConfig {
	system: string;
	baseBlockDir: string;
	k8sDir: string;
	realms: { [name: string]: any };
	blocks: (string | any)[];


	imageTag: string; // set if not found
	__version__: string; // popuplate if not found

	version?: {
		files?: string[]
	}
}
// --------- /Public Types --------- //


// --------- Public Loaders --------- //
const overwriteMerge = (target: any[], source: any[], options?: deepmerge.Options) => source

/** Parse the ./vdev.yaml and return as is */
export async function loadVdevConfig(rootDir?: string): Promise<RawVdevConfig> {
	rootDir = rootDir || "./";
	const vdevFile = Path.join(rootDir, 'vdev.yaml');

	//// Get the __version__
	const packageJson = await fs.readJSON('./package.json');
	let __version__ = packageJson.__version__ ?? packageJson.version;

	//// build the data for the vdev template
	// TODO: probably needs to put the other variable from the handlebars helpers here
	const data: any = { __version__ };

	// NOTE: Here we use the loadTempletezedYaml, but for now, the vdev files are not templates, just the k8s yamls are.
	let vdevObj = await loadVdevFile(vdevFile, true, data);

	// TODO: probably need to do some validate here.

	// load the sub vdev files if defined
	if (vdevObj.vdevFiles) {
		for (const subRelVdevFile of vdevObj.vdevFiles) {
			const subVdevFile = Path.join(rootDir, subRelVdevFile);
			const exists = await fs.pathExists(subVdevFile);
			if (exists) {
				console.log(`INFO - Loading extra vdev file: ${subVdevFile}`);
				try {
					let subVdevObj = await loadVdevFile(subVdevFile, false, data);
					vdevObj = deepmerge(vdevObj, subVdevObj, { arrayMerge: overwriteMerge });
				} catch (ex) {
					console.log(`ERROR - Cannot load vdev files ${subVdevFile} (skipping file)\n\tCause: ${ex}`);
				}
			}
		}
	}

	//// Allow the __version__ to be updated
	vdevObj.__version__ = __version__;
	vdevObj.imageTag = vdevObj.imageTag ?? 'latest';


	return vdevObj as RawVdevConfig;
}
// --------- /Public Loaders --------- //

/**
 * Load a single vdev yaml file. Can be the base or a sub vdev file
 * @param base If the vdev file is the base (should have more validation)
 */
async function loadVdevFile(vdevFile: string, base: boolean, data?: any): Promise<any> {
	const vdevRawObj = await loadTemplatizedYaml(vdevFile, data);
	// TODO: need to do validation
	return vdevRawObj;
}