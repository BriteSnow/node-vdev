import { saferRemove } from 'backlib';
import { stat } from 'fs-extra';
import { rollupFiles } from '../../src/processors';

describe('rollup', async () => {

	it('rollup-ts', async function () {
		// this.timeout(5000); // not needed for now

		const distDir = 'test-data/rollup/.out';
		const distFile = distDir + '/bundle.js';

		await saferRemove(distDir);

		await rollupFiles(['test-data/rollup/src/main.ts'], distFile, { watch: false, tsconfig: 'test-data/rollup/tsconfig.json' });


		const statFile = await stat(distFile);
		if (statFile.size < 1) {
			throw new Error(`rollup did not generate the output file at ${distFile}`);
		}
	})

});