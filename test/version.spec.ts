import { readFile } from 'fs-extra-plus';

import { updateVersions } from '../src/block';

describe('version', async () => {


	it('version', async () => {

		const config = {
			version: {
				appVersion: 'DROP-999',
				files: [
					'./test-data/version/some.html',
					'./test-data/version/some.ts',
					'./test-data/version/some.yaml'
				]
			}
		};

		await updateVersions(config);

		// we reset it back
		config.version.appVersion = 'DROP-001';
		await updateVersions(config);

	});

});