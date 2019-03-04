import * as Path from 'path';

export interface File {
	bucket: Bucket;
	name: string;
	size: number;
	local?: string; // optional local file path
}


export interface DownloadEvents {
	startFile?: (file: File) => void;
	endFile?: (file: File) => void;
}



export interface Bucket {
	name: string;

	getFile(path: String): Promise<File | null>;

	list(prefixOrGlob?: String): Promise<File[]>;

	copy(path: string, to: string | File): Promise<void>;

	download(prefixOrGlob: string, localDir: string, on?: DownloadEvents): Promise<File[]>

	upload(localPath: string, path: string): Promise<File>

	delete(path: string): Promise<boolean>

}


//#region    ---------- Common Bucket Utils ---------- 
export function buildFullDestPath(localPath: string, destPath: string) {
	const srcBaseName = Path.basename(localPath);
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

	return fullDestPath;
}

/**
 * Return a clean prefix and glob when defined in the string. Clean prefix, meaning, glob less one, that can be passed to most cloud storage api. 
 * 
 * @param prefixOrGlob undefined, null, e.g., 'some-prefix', 'folder/', 'folder/glob-pattern.*'
 * @returns {prefix, glob} each can be undefined. Prefix is the first characters unitl the first glob character ('*')
 */
export function extractPrefixAndGlob(prefixOrGlob?: string) {
	let glob: string | undefined;
	let prefix: string | undefined;

	if (prefixOrGlob && prefixOrGlob.length > 0) {
		const firstWildIdx = prefixOrGlob.indexOf('*');
		// if it has a '*' then it is a pattern
		if (firstWildIdx > 0) {
			glob = prefixOrGlob;
			prefix = prefixOrGlob.substring(0, firstWildIdx - 1);
		}
		// otherwise, it is just a 
		else {
			prefix = prefixOrGlob;
		}
	}

	return { prefix, glob };
}
//#endregion ---------- /Common Bucket Utils ---------- 



////// Thoughts

/**
 * NOT IMPLEMENTED YET
 * Can be set in bucket constructor, or overrided per call. 
 */
interface Options {
	log: boolean | string; // (default true) true to log, string to log with a prefix 
	skipOnFatal: boolean | Function;
	beforeAction: Function;
	afterAction: Function;
}
