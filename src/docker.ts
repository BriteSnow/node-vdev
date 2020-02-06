import { spawn } from 'p-spawn';
import { Block, buildBlock, loadDockerBlocks } from './block';
import { callHook } from './hook';
import { getRemoteImageName, Realm } from './realm';
import { addSessionState, hasSessionState } from './session';
import { asNames, now, printLog } from './utils';


/**
 * Push the local docker image for the service(s) to the remote (tag and push)
 * Assumptions:
 *   - Assume the service names match the docker image convention as is on a local docker repo (localhost:5000/...)
 *   - Today assume remote is gcloud
 * @param realm 
 * @param serviceNames 
 */
export async function push(realm: Realm, serviceNames?: string | string[]) {
	let names: string[];
	const dockerBlocks = await loadDockerBlocks();

	if (serviceNames) {
		names = asNames(serviceNames);
	} else {
		const dockerBlocks = await loadDockerBlocks();
		names = Object.keys(dockerBlocks)
	}

	if (realm.registry == null) {
		throw new Error(`Realm '${realm.name}' does not have registry, cannot push docker image.`);
	}

	//// Call prep hook the docker push
	await callHook(realm, "dpush_prep", names);

	//// For each service, push the docker image
	for (let serviceName of names) {
		const block = dockerBlocks[serviceName];
		if (!block) {
			throw new Error(`Block ${serviceName} not found`);
		}
		let sourceImage = getLocalImageName(block);
		let remoteImage = getRemoteImageName(block, realm);

		console.log(`----- Pushing service ${serviceName} : ${remoteImage}`);

		// we make sure the tag exist
		await spawn('docker', ['tag', sourceImage, remoteImage]);

		// This assume gcloud has been setup on the local machine
		// Note: gcloud requires `gcloud auth configure-docker` and just use `docker push...
		try {
			await spawn('docker', ['push', remoteImage]);
		} catch (ex) {
			// Note: Allow the hook to eventually recorver. 
			const passed = await callHook(realm, 'dpush_image_ex', ex, remoteImage);
			// If the dpush_image_ex return true, means it was recovered.
			// Otherwise there might not have been any hook or could not recover. (note that the hook could throw ex as well)
			if (passed !== true) {
				throw ex;
			}
		}
		console.log(`----- /DONE pushing ${serviceName} : ${remoteImage} ------\n`);
	}
}


export async function buildDockerImage(block: Block) {
	const dir = block.dir;
	const imageName = getLocalImageName(block);

	const start = now();

	console.log(`============ BUILDING docker image: ${imageName}\n`);

	// check if this block has a dbuildDependencies
	const dbuildDeps = asNames(block.dbuildDependencies);
	for (let dep of dbuildDeps) {
		await buildBlock(dep);
	}

	// make sure we build the service first
	await buildBlock(block.name);

	// build the image
	console.log(`------ docker build ... ${imageName}`);
	await spawn('docker', ['build', '--rm', '-t', imageName, '.'], { cwd: dir });
	console.log(`------ DONE - docker build ... ${imageName}`);

	console.log();

	// it can be use by future k8s after push
	let status = 'DONE';
	console.log(`------ docker push ... ${imageName}`);
	try {
		if (!hasSessionState('NO_LOCAL_REGISTRY')) {
			await spawn('docker', ['push', imageName]);
		}
	} catch (ex) {
		addSessionState('NO_LOCAL_REGISTRY');
	}
	if (hasSessionState('NO_LOCAL_REGISTRY')) {
		console.log('INFO - No Local Registry (http://localhost:5000/) - Skipping push to local registry');
		status = "SKIPPING";
	}

	console.log(`------ ${status} - docker push ... ${imageName}`);

	printLog(`\n============ DONE - BUILDING docker image: ${imageName}`, start);
}


//#region    ---------- docker naming ---------- 
export function getLocalImageName(block: Block) {
	return _getImageName(block, 'localhost:5000/');
}

export function _getImageName(block: Block, basePath: string) {
	const repoName = getRepositoryName(block);
	return `${basePath}${repoName}:${block.imageTag}`;
}

export function getRepositoryName(block: Block) {
	return `${block.system}-${block.name}`;
}

//#endregion ---------- /docker naming ---------- 