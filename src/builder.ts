/////////////////////
// Builder interfaces and utilities for block builders
////

import { pathExists } from 'fs-extra';
import * as Path from 'path';
import { Block } from './block';


const all_builders: Builder[] = [];


export function registerBuilder(builder: Builder) {
	all_builders.push(Object.freeze(builder));
}

export async function getBuilders(block: Block): Promise<Builder[]> {
	let builders: Builder[] = [];

	const replaceNames = new Set<string>();

	for (const builder of all_builders) {
		let pass = false;
		if (typeof builder.predicate == 'string') {
			const builderFile = Path.join(block.dir, builder.predicate);
			pass = await pathExists(builderFile);
		} else {
			pass = await builder.predicate(block);
		}

		if (pass) {
			builders.push(builder);
			if (builder.replace) {
				builder.replace.forEach(n => replaceNames.add(n));
			}
		}

	}

	if (replaceNames.size > 0) {
		builders = builders.filter(b => !replaceNames.has(b.name));
	}

	builders.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	return builders;
}


export interface Builder {
	name: string,
	/** 
	 * Predicate match to determine if the block has this build
	 * - if string, then return true if match file name in block.dir
	 * - if function, pass block as arg, and expect true/false */
	predicate: string | ((block: Block) => Promise<boolean>),
	order?: number, // starts with he lowest number. 0 is the default. 
	replace?: string[]; // optional list of builder that this builder replaces

	build(block: Block, watch?: boolean): Promise<void>;
}
