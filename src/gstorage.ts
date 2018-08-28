import Storage = require('@google-cloud/storage');
import * as nodePath from 'path';
import { loadYaml } from './utils';
import micromatch = require('micromatch');

const defaultStorage = `dev-media-store`;



// --------- Public list/copy/del/download/upload --------- //
export async function list(pathInfo: PathInfo) {
	const bucket = await getBucket(pathInfo);
	const result = await bucket.getFiles();

	let gfList = result[0] || [];

	// if we have glob, we filter the list
	if (pathInfo.path) {
		const path = pathInfo.path;
		gfList = gfList.filter(gf => micromatch.isMatch(gf.name, path))
	}

	return gfList;
}

export async function copy(from: PathInfo, to: PathInfo) {
	const files = await list(from);
	const destBucket = await getBucket(to);

	for (let gf of files) {

		const basename = nodePath.basename(gf.name);
		const destPath = (to.path || '') + basename;
		const destFile = destBucket.file(destPath);
		console.log(`Will copy file ${from.store}:${gf.name} to bucket ${to.store}:${destPath}`);
		await gf.copy(destFile);
	}

}


export interface DownloadEvents {
	startFile?: (file: Storage.File) => void;
	endFile?: (file: Storage.File) => void;
}

// TODO: needs to have destDir be dir or file. 
// FIXME: when dir, destDir should be added a "/" to make sure or use path join
// TODO: needs to implement or remove the on download events. Not supported right now. 
export async function download(from: PathInfo, destDir: string, on?: DownloadEvents) {
	const gfList = await list(from);

	for (let gf of gfList) {
		const baseName = nodePath.basename(gf.name);
		console.log(`will download file ${gf.name} to ${destDir}${baseName}`);
		await gf.download({ destination: `${destDir}${baseName}` });
	}
}

export async function upload(localFile: string, destPathInfo: PathInfo) {
	const destBucket = await getBucket(destPathInfo);
	const srcBaseName = nodePath.basename(localFile);
	const destPath = destPathInfo.path;
	let fullDestPath: string;
	// we we do not have a dest path, then just the 
	if (!destPath) {
		fullDestPath = srcBaseName;
	}
	// if it is a folder, we just concatinate the base name
	else if (destPath.endsWith('/')) {
		fullDestPath = destPath + srcBaseName;
	}
	// if the destPath is not a folder, assume it is the new file name.
	else {
		fullDestPath = destPath;
	}
	console.log(`will upload file ${localFile} to gs://${destBucket.name}/${fullDestPath}`);
	await destBucket.upload(localFile, { destination: fullDestPath });
}
// --------- /Public list/cp/del/download/upload ------, --- //

// --------- public PathInfo --------- //
export type PathInfo = {
	store: string,
	path?: string, // path or glob
}

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

async function getBucket(pathInfo: PathInfo) {
	const bucketInfo = await getBucketInfo(pathInfo.store);
	const storage = new Storage(bucketInfo.conf);
	return storage.bucket(bucketInfo.bucketName)
}

// --------- /Private Utils --------- //

// --------- Config --------- //
type BucketInfo = {
	name: string,
	bucketName: string,
	conf: {
		projectId: string;
		credentials: {
			client_email: string;
			private_key: string;
		}
	}
}


async function getBucketInfo(name: string): Promise<BucketInfo> {
	const rawConfig = await loadRawConfig();
	const bucketRawConfig = rawConfig[name];
	if (!bucketRawConfig) {
		throw new Error(`bucket config for ${name} not found`);
	}
	return {
		name: name,
		bucketName: bucketRawConfig.bucketName,
		conf: {
			projectId: bucketRawConfig.projectId,
			credentials: {
				client_email: bucketRawConfig.client_email,
				private_key: bucketRawConfig.private_key,
			}
		}
	}
}

async function loadRawConfig() {
	let vdevBuckets: any = await loadYaml('vdev-buckets.yaml');
	const confs = vdevBuckets.buckets;
	// add the .name to each bucket info
	for (let name in confs) {
		confs[name].name = name;
	}
	return confs;
}
// --------- /Config --------- //