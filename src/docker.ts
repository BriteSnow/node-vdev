import { spawn } from 'p-spawn';
import { Block, buildBlock, loadDockerBlocks } from './block';
import { getLocalImageName, getRemoteImageName, Realm } from './realm';
import { asNames, now, printLog } from './utils';
import { callHook } from './hook';


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
	if (serviceNames) {
		names = asNames(serviceNames);
	} else {
		const dockerBlocks = await loadDockerBlocks();
		names = Object.keys(dockerBlocks)
	}

	//// Call prep hook the docker push
	await callHook(realm, "dpush_prep", names);

	//// For each service, push the docker image
	for (let serviceName of names) {
		let sourceImage = getLocalImageName(realm, serviceName)
		let remoteImage = getRemoteImageName(realm, serviceName);

		console.log(`----- Pushing service ${serviceName} : ${remoteImage}`);

		// we make sure the tag exist
		await spawn('docker', ['tag', sourceImage, remoteImage]);

		// This assume gcloud has been setup on the local machine
		// Note: gcloud requires `gcloud auth configure-docker` and just use `docker push...
		await spawn('docker', ['push', remoteImage]);

		// old way
		//await spawn('gcloud', ['docker', '--', 'push', remoteImage]);

		console.log(`----- /DONE pushing ${serviceName} : ${remoteImage} ------\n`);
	}
}


export async function buildDockerImage(realm: Realm, block: Block) {
	const dir = block.dir;
	const imageName = getLocalImageName(realm, block.name);

	const start = now();

	console.log(`------------ BUILDING docker image: ${imageName}\n`);

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
	console.log(`------ docker push ... ${imageName}`);
	await spawn('docker', ['push', imageName]);
	console.log(`------ DONE - docker push ... ${imageName}`);

	printLog(`\n------------ DONE - BUILDING docker image: ${imageName}`, null, start);
}