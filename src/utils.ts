import * as fs from 'fs-extra-plus';
import * as jsyaml from 'js-yaml';
import { ParsedArgs } from 'minimist';
import stripJsonComments from 'strip-json-comments';
import { split } from 'utils-min';


// --------- Lang & Type Utils --------- //

export type Partial<T> = {
	[P in keyof T]?: T[P];
}

// for the bin-vdev & cmd-*
export type CmdMap = { [fnName: string]: (miniArgv: ParsedArgs, rawArgv: string[]) => void }

/**
 * Split the eventual comman deliminated string as array of trim items. 
 * If array just return the array, if null, return empty array
 * @param srcNames comma deliminated, single name, or array of names
 */
export function asNames(srcNames?: string | string[] | null) {
	if (srcNames) {
		if (typeof srcNames === 'string') {
			return split(srcNames, ',');
		} else {
			return srcNames;
		}
	} else {
		return [];
	}
}
// --------- /Lang & Type Utils --------- //


// --------- Utils --------- //
export async function yaml(content: string) {
	const yamlObj = jsyaml.load(content);
	if (!yamlObj) {
		throw new Error(`Could not load yaml`);
	}
	return yamlObj;
}

export async function loadYaml(path: string) {
	const yamlContent = await fs.readFile(path, 'utf8');
	return yaml(yamlContent);
}

export async function readJsonFileWithComments(path: string) {
	const content = await fs.readFile(path, 'utf8');
	return JSON.parse(stripJsonComments(content));
}


// return now in milliseconds using high precision
export function now() {
	var hrTime = process.hrtime();
	return hrTime[0] * 1000 + hrTime[1] / 1000000;
}

export async function printLog(txt: string, start: number, dist?: string | null) {
	const timeStr = Math.round(now() - start) + 'ms';

	let msg = `${txt} - `;

	if (dist == null) {
		msg += timeStr;
	} else {
		const distExists = await fs.pathExists(dist);
		if (distExists) {
			let size = (await fs.stat(dist)).size;
			size = Math.round(size / 1000.0);
			msg += `${dist} - ${timeStr} - ${size} kb`;
		} else {
			msg += `${dist} - ${timeStr} - ... watch mode started ...`
		}
	}
	console.log(msg);
}

export async function prompt(message: string) {
	// console.log(`\n${message}: `);
	process.stdout.write(`\n${message}: `);
	return new Promise(function (resolve, reject) {
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', function (text) {
			process.stdin.pause();
			resolve(text.toString().trim());
		});
	});
}

/** Attempted to return the obj value given a dottedNamePath (i.e. 'author.name'). 
 * @returns undefined if nothing found or obj or dottedNamePath is null/undefined. Return obj if dottedNamePath == ''.
 **/
export function findVal(obj: any, dottedNamePath: string) {
	if (obj == null || dottedNamePath == null) {
		return;
	}
	if (dottedNamePath.trim() === '') {
		return obj;
	}

	let val: any = obj;
	const names = dottedNamePath.split('.');
	for (let name of names) {
		val = val[name];
		if (val == null) { // if null or undefined, stop and return
			return val;
		}
	}
	return val;
}
// --------- /Utils --------- //






