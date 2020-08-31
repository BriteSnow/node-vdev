import { Bucket, getBucket } from 'cloud-bucket';
import { pathExists } from 'fs-extra';
import { loadYaml } from './utils';

export type PathInfo = {
	store: string,
	path?: string, // path or glob
}


// --------- Public list/copy/del/download/upload --------- //
export async function list(pathInfo: PathInfo) {
	const bucket = await getBucketFromPathInfo(pathInfo);
	const result = await bucket.listFiles(pathInfo.path);
	return result;
}

export async function copy(from: PathInfo, to: PathInfo) {
	const files = await list(from);
	const destBucket = await getBucketFromPathInfo(to);
	// FIXME: Need to be implemented
}

export async function download(from: PathInfo, destDir: string) {
	if (from.path == null) {
		throw new Error(`Cannot download - undefined remote path: ${from.store}:${from.path}`);
	}
	const bucket = await getBucketFromPathInfo(from);
	return bucket.download(from.path, destDir);
}

export async function upload(localFile: string, dest: PathInfo) {
	if (dest.path == null) {
		throw new Error(`Cannot download - undefined remote path: ${dest.store}:${dest.path}`);
	}
	const bucket = await getBucketFromPathInfo(dest);
	return bucket.upload(localFile, dest.path);
}
// --------- /Public list/cp/del/download/upload ------, --- //

// --------- public PathInfo --------- //


const formatInfo = `'storename:path' or just 'storename'`;

export function parsePathInfo(storeAndPathStr?: string) {
	if (storeAndPathStr == null || storeAndPathStr.length == 0) {
		throw new Error(`gs need to have a path like ${formatInfo}`);
	}
	const storeAndPath = storeAndPathStr.split(':');
	if (storeAndPath.length > 2) {
		throw new Error(`Path ${storeAndPathStr} is invalid, needs to be of format like  ${formatInfo}`)
	}

	const [store, path] = storeAndPath;

	return { store, path };

}
// --------- /public PathInfo --------- //


// --------- Private Utils --------- //

async function getBucketFromPathInfo(pathInfo: PathInfo): Promise<Bucket> {
	const bucketCfgs = await loadRawBucketsConfig();

	const rawCfg = bucketCfgs?.[pathInfo.store];
	if (rawCfg == null) {
		throw new Error('VDEV ERROR - cannot find bucket ${pathInfo.store} in .vdev-buckets.yaml file');
	}
	return getBucket({ ...rawCfg, log: true });

}


async function loadRawBucketsConfig() {
	const files = ['.vdev-buckets.yaml', 'vdev-buckets.yaml'];
	let vdevBuckets: any;
	for (const file of files) {
		if (await pathExists(file)) {
			vdevBuckets = await loadYaml(file);
			break;
		}
	}
	if (vdevBuckets != null) {
		const confs = vdevBuckets.buckets;
		// add the .name to each bucket info
		for (let name in confs) {
			confs[name].name = name;
		}
		return confs;
	}
}

// --------- /Private Utils --------- //