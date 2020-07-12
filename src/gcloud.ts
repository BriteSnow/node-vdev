import { spawn } from 'p-spawn';

// --------- Public get/set current project --------- //
export async function getCurrentProject() {
	const p = await spawn('gcloud', ['config', 'list', '--format', 'value(core.project)'], { capture: 'stdout' });
	return p.stdout!.toString().trim();
}

export async function setCurrentProject(name: string) {
	// gcloud config set project my-project
	await spawn('gcloud', ['config', 'set', 'project', name]);
}
// --------- /Public get/set current project --------- //