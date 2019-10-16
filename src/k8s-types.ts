

//#region    ---------- kubernetes type subset ---------- 
export interface PodItem {
	kind: 'Pod',
	metadata: {
		name: string,
		namespace: string,
		labels: { [key: string]: string },
	},
	spec: {
		containers?: {
			name: string,
			image: string,
		}[]
	}
}
/** 
 * This is minimalist typing of the native kubernetes result object on kubectl get pods. 
 * It respect the kubernetes object structure but just defined what is needed for vdev (does not intend to be exhaustive).
 */
export interface GetPodResponse {
	items: PodItem[];
}

export interface PodItemFilter {
	imageName?: string,
	labels?: { [key: string]: string }
}
//#endregion ---------- /kubernetes type subset ---------- 


//#region    ---------- vdev kubernetes object types ---------- 
/**
 * Simplified kubernetes PodItem object.
 */
export interface KPod {
	name: string;
	namespace: string
	containers: {
		name: string
	}[];
}

/** Return a KPod simplified object from a native kubernetes PodItem. */
export function toKPod(podItem: PodItem): KPod {
	const containers = (podItem.spec.containers) ? podItem.spec.containers.map(ctn => { return { name: ctn.name } }) : []
	return {
		name: podItem.metadata.name,
		namespace: podItem.metadata.namespace,
		containers
	}
}

//#endregion ---------- /vdev kubernetes object types ----------
