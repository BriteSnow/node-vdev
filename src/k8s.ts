import { getResourceNames, renderRealmFile } from './realm';
import { Realm } from './realm';
import { asNames, prompt } from './utils';
import { spawn } from 'p-spawn';

// --------- Public create/delete/logs/restart --------- //
export async function kcreate(realm: Realm, resourceNames?: string | string[]) {
	const names = await getResourceNames(realm, resourceNames);

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
	const names = await getResourceNames(realm, resourceNames);

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
	const names = await getResourceNames(realm, resourceNames);

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
	const names = await getResourceNames(realm, resourceNames);
	const pods = await fetchK8sObjectsByType(realm, 'pods');

	for (let serviceName of names) {
		const podNames = await getPodNames(pods, { labels: { run: `${realm.system}-${serviceName}` } });

		for (let podName of podNames) {
			console.log(`Will show log for pod: ${podName}`);
			const args = ['logs', '-f', podName];
			addNamespaceIfDefined(realm, args);
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
						console.log(`----- LOG for: ${serviceName} / ${podName} `);
						currentLogPodName = podName;
					}

					// print the info
					process.stdout.write(data);
				}
			});
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
export async function getCurrentContext() {
	// kubectl config current-context
	const psResult = await spawn('kubectl', ['config', 'current-context'], { capture: 'stdout' });
	return psResult.stdout.toString().trim();
}

export async function setCurrentContext(name: string) {
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
	const podsJsonStr = psResult.stdout.toString();
	const result = JSON.parse(podsJsonStr);
	return result.items || [];
}


// return the pod names 
// Today filter: {imageName: string, labels: {[string]: value} (All properties of the filter must match (i.e. AND))
function getPodNames(items: any[], filter?: { imageName?: string, labels?: { [key: string]: string } }) {
	const names = [];
	if (items) {
		for (let item of items) {
			let pass = false;
			const itemName = item.metadata.name;

			// test the filter.imageName
			if (filter && filter.imageName) {
				// Note: for now, just assume one container per pod, which should be the way to go anyway.
				const itemImageName = (item.spec && item.spec.containers) ? item.spec.containers[0].image : null;
				if (itemImageName != null && itemImageName.startsWith(filter.imageName)) {
					pass = true;
				} else {
					pass = false;
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

			// if pass, adde it.
			if (pass) {
				names.push(itemName);
			}
		}
	}
	return names;
}

// --------- /Private Utils --------- //