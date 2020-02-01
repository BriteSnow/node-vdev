
import * as fs from 'fs-extra-plus';
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

	version?: {
		value?: string // if not set, the root package.json .version is taken
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
	// NOTE: Here we use the loadTempletezedYaml, but for now, the vdev files are not templates, just the k8s yamls are.
	let vdevObj = await loadVdevFile(vdevFile, true);

	// TODO: probably need to do some validate here.

	// load the sub vdev files if defined
	if (vdevObj.vdevFiles) {
		for (const subRelVdevFile of vdevObj.vdevFiles) {
			const subVdevFile = Path.join(rootDir, subRelVdevFile);
			const exists = await fs.pathExists(subVdevFile);
			if (exists) {
				console.log(`INFO - Loading extra vdev file: ${subVdevFile}`);
				try {
					let subVdevObj = await loadVdevFile(subVdevFile);
					vdevObj = deepmerge(vdevObj, subVdevObj, { arrayMerge: overwriteMerge });
				} catch (ex) {
					console.log(`ERROR - Cannot load vdev files ${subVdevFile} (skipping file)\n\tCause: ${ex}`);
				}
			}

		}
	}


	return vdevObj as RawVdevConfig;
}
// --------- /Public Loaders --------- //

/**
 * Load a single vdev yaml file. Can be the base or a sub vdev file
 * @param base If the vdev file is the base (should have more validation)
 */
async function loadVdevFile(vdevFile: string, base = false): Promise<any> {
	const vdevRawObj = await loadTemplatizedYaml(vdevFile);
	// TODO: need to do validation
	return vdevRawObj;
}