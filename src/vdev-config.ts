
import { loadTemplatizedYaml } from './renderer';



// --------- Public Types --------- //
export interface RawVdevConfig {
	system: string;
	baseBlockDir: string;
	k8sDir: string;
	realms: { [name: string]: any };
	blocks: (string | any)[];

	versionFiles: string[];
}
// --------- /Public Types --------- //


// --------- Public Loaders --------- //
export async function loadVersionFiles() {
	const rawConfig = await loadVdevConfig();
	return rawConfig.versionFiles || [];
}

/** Parse the ./vdev.yaml and return as is */
export async function loadVdevConfig(): Promise<RawVdevConfig> {
	const conf = await loadTemplatizedYaml('./vdev.yaml');
	// TODO: probably need to do some checks here.
	return conf as RawVdevConfig;
}
// --------- /Public Loaders --------- //