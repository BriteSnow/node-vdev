import { spawn } from 'p-spawn';
import { GetPodResponse, KPod, PodItem, PodItemFilter, toKPod } from './k8s-types';
import { getConfigurationNames, Realm, renderRealmFile } from './realm';
import { asNames, prompt } from './utils';

// --------- Public create/delete/logs/restart --------- //
export async function kcreate(realm: Realm, resourceNames?: string | string[]) {
	const names = await getConfigurationNames(realm, resourceNames);

	for (let name of names) {
		const fileName = await renderRealmFile(realm, name);
		try {
			const args = ['create', '-f', fileName];
			await spawn('kubectl', args);
		} catch (ex) {
			console.log(`Can't kcreate ${fileName}, skipping`);
		}
		console.log();
	}

}

export async function kapply(realm: Realm, resourceNames?: string | string[]) {
	const names = await getConfigurationNames(realm, resourceNames);

	for (let name of names) {
		const fileName = await renderRealmFile(realm, name);
		try {
			const args = ['apply', '-f', fileName];
			addNamespaceIfDefined(realm, args);
			await spawn('kubectl', args);
		} catch (ex) {
			console.log(`Can't kapply ${fileName}, skipping`);
		}
		console.log();
	}
}

// TODO: need to have a way to force the YES when use as API outside of cmd.
export async function kdel(realm: Realm, resourceNames?: string | string[]) {
	const names = await getConfigurationNames(realm, resourceNames);

	// If flagged as prod, we do a 
	if (realm.confirmOnDelete) {
		const answer = await prompt("Do you really want to delete? (YES to continue)");
		if (answer !== "YES") {
			console.log(`Operation not confirmed. Exiting (nothing done).`);
			return;
		}
	}

	for (let kName of names) {
		const fileName = await renderRealmFile(realm, kName);
		const args = ['delete', '-f', fileName];
		addNamespaceIfDefined(realm, args);
		try {
			await spawn('kubectl', args);
		} catch (ex) {
			console.log(`Can't kdelete ${kName}, skipping`);
		}
		console.log();
	}
}

let currentLogPodName: string | null = null;

export async function klogs(realm: Realm, resourceNames?: string | string[]) {
	const names = await getConfigurationNames(realm, resourceNames);
	const pods = await fetchK8sObjectsByType(realm, 'pods');

	for (let serviceName of names) {
		const kpods = await getKPods(pods, { labels: { run: `${realm.system}-${serviceName}` } });

		for (const kpod of kpods) {
			const podName = kpod.name;
			for (const ctn of kpod.containers) {
				const ctnName = ctn.name;

				const args = ['logs', '-f', podName, '-c', ctnName];
				addNamespaceIfDefined(realm, args);
				console.log(`Will output logs for -> kubectl ${args.join(' ')}`);
				// Note: here we do not await, because, we want to be able to launch multiple at the same time, and not be blocking.
				spawn('kubectl', args, {
					detached: true,
					onStdout: function (data) {
						// If we had a log block before, and not the same as this one, we end it. 
						if (currentLogPodName != null && currentLogPodName !== podName) {
							console.log('-----------\n');
						}

						// if the current log block is not this one, we put a new start
						if (currentLogPodName !== podName) {
							console.log(`----- LOG for: ${serviceName} / ${podName} / ${ctnName}`);
							currentLogPodName = podName;
						}

						// print the info
						process.stdout.write(data);
					}
				});
			}

		}
	}
}


/**
 * Will kubectl exec /service/restart.sh (will assume the pods/containers has one).
 * Assumptions:
 *   - One container per pod.
 *   - Does not check if /service/restart.sh exists, so, will crash if not. 
 * @param runLabelPrefix 
 * @param serviceNamesStr 
 */
export async function kshRestart(realm: Realm, serviceNamesStr: string) {
	const serviceNames = asNames(serviceNamesStr);

	const pods = await fetchK8sObjectsByType(realm, 'pods');

	for (let serviceName of serviceNames) {
		const podNames = await getPodNames(pods, { labels: { run: `${realm.system}-${serviceName}` } });

		for (let podName of podNames) {

			// TODO need to check if there is a /service/restart.sh
			try {
				const args = ['exec', podName];
				addNamespaceIfDefined(realm, args);
				args.push('--', 'test', '-e', '/service/restart.sh');
				await spawn('kubectl', args, { toConsole: false });
			} catch (ex) {
				console.log(`Skipping service ${serviceName} - '/service/restart.sh' not found.`);
				continue;
			}
			console.log(`\n--- Restarting: ${serviceName} (pod: ${podName})`);
			const args = ['exec', podName];
			addNamespaceIfDefined(realm, args);
			args.push('--', '/service/restart.sh');
			await spawn('kubectl', args);
			console.log(`--- DONE: ${serviceName} : ${podName}`);
		}
	}
	// TODO: Run: kubectl exec $(kubectl get pods -l run=halo-web-server --no-headers=true -o custom-columns=:metadata.name) -- /service/restart.sh
	// TODO: needs to check if the service has restart.sh in the source tree, otherwise warn and skip the service
}

export async function kexec(realm: Realm, serviceNamesStr: string, commandAndArgs: string[]) {
	const serviceNames = asNames(serviceNamesStr);
	const pods = await fetchK8sObjectsByType(realm, 'pods');

	for (let serviceName of serviceNames) {
		const podNames = await getPodNames(pods, { labels: { run: `${realm.system}-${serviceName}` } });

		for (let podName of podNames) {

			try {
				let args = ['exec', podName]
				addNamespaceIfDefined(realm, args);

				args.push('--'); // base arguments
				args = args.concat(commandAndArgs); // we add the sub command and arguments
				await spawn('kubectl', args); // for now, we have it in the toConsole, but should put it configurable
			} catch (ex) {
				console.log(`Cannot run ${commandAndArgs} on pod ${podName} because ${ex}`);
				continue;
			}
		}
	}
}
// --------- /Public create/delete/logs/restart --------- //

// --------- Public get/set context --------- //
// fetch the current context
export async function getCurrentContext(): Promise<string | null> {
	// kubectl config current-context
	const psResult = await spawn('kubectl', ['config', 'current-context'], { capture: ['stdout', 'stderr'], ignoreFail: true });
	if (psResult.stderr) {
		// console.log(`INFO: ${psResult.stderr}`);
		return null;
	} else {
		return psResult.stdout!.toString().trim() as string;
	}

}

export async function setCurrentContext(name: string) {
	// TODO: perhaps when null, should unset it: 'kubectl config unset current-context'
	//       downside is that it can create some unwanted side effect, if the user has another context set
	await spawn('kubectl', ['config', 'use-context', name]);
}
// --------- /Public get/set context --------- //


// --------- Private Utils --------- //
function addNamespaceIfDefined(realm: Realm, args: string[]) {
	const namespace = realm.namespace;
	if (namespace) {
		args.push('--namespace', namespace);
	}
}

// Fetch the pod for a part
async function fetchK8sObjectsByType(realm: Realm, type: string) {
	const args = ['get', type, '-o', 'json'];
	addNamespaceIfDefined(realm, args);
	const psResult = await spawn('kubectl', args, { capture: 'stdout' });
	const podsJsonStr = psResult.stdout!.toString();
	const response = JSON.parse(podsJsonStr) as GetPodResponse;
	return response.items || [];
}


// return the pod names 
function getPodNames(pods: PodItem[], filter?: { imageName?: string, labels?: { [key: string]: string } }) {
	const kpods = getKPods(pods, filter);
	return kpods.map(kpod => kpod.name);
}

/**
 * Return the list of kpods for a give list of PodItems and a optional filter.
 * @param pods PodItem array
 * @param filter PodItemFilter
 */
function getKPods(pods: PodItem[], filter?: PodItemFilter): KPod[] {
	const kpods: KPod[] = [];
	for (let item of pods) {
		let pass = true;

		const itemName = item.metadata.name;

		// test the filter.imageName
		if (filter && filter.imageName) {
			// Note: for now, just assume one container per pod, which should be the way to go anyway.
			const itemImageName = (item.spec && item.spec.containers) ? item.spec.containers[0].image : null;
			if (itemImageName != null && itemImageName.startsWith(filter.imageName)) {
				pass = true;
			} else {
				// pass = false;
				continue; // if false, we can stop this item now.
			}
		}

		// test the filter.labels
		if (filter && filter.labels) {
			for (let labelName in filter.labels) {
				if (item.metadata.labels[labelName] === filter.labels[labelName]) {
					pass = true;
				} else {
					pass = false;
					continue; // if false, we can stop now
				}
			}
		}

		// 
		if (pass) {
			kpods.push(toKPod(item));
		}
	}

	return kpods;
}

// --------- /Private Utils --------- //