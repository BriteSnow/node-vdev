import { deepStrictEqual as equal, match } from 'assert';
import { saferRemove } from 'backlib';
import { pathExists, readFile } from 'fs-extra';
import * as Path from 'path';
import { Block } from '../../src/block';
import { getBuilders } from '../../src/builder';
import '../../src/builder-builtins';


describe('builder', async () => {

	it('builder-rollup-ts', async function () {
		this.timeout(5000);
		const blockDir = 'test-data/builder/rollup-ts/';
		const distDir = Path.join(blockDir, '.dist');

		// delete eventual previous output
		await saferRemove(distDir);

		const block: Block = {
			name: 'builder-rollup-ts',
			system: 'test',
			__version__: '000',
			dir: blockDir,
			imageTag: '_image_tag_'
		};

		const rollupBuilders = await getBuilders(block);

		for (const builder of rollupBuilders) {
			console.log('->> builder', builder.name);
			await builder.build(block);
		}

		// check if output exist
		const jsContent = await readFile(Path.join(distDir, 'app-bundle.js'), 'utf-8');
		match(jsContent, /'Hello World'/g);

		equal(true, await pathExists(Path.join(distDir, 'app-bundle.js.map')), 'js map exists')
	})

});