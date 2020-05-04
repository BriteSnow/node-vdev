import { mkdirp, saferRemove, stat } from 'fs-extra-plus';
import { pcssFiles } from '../src/processors';

describe('pcss', async () => {

	it('pcss-main', async function () {
		// this.timeout(5000); // not needed for now

		const distDir = 'test-data/pcss/.out';
		const distFile = distDir + '/main.css';

		await saferRemove(distDir);

		await mkdirp(distDir);

		await pcssFiles(['test-data/pcss/main.pcss'], distFile);

		const statFile = await stat(distFile);
		if (statFile.size < 1) {
			throw new Error(`pcss did not generate the output file at ${distFile}`);
		}
	})

});