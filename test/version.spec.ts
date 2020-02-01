import { updateVersions } from '../src/block';


describe('version', async () => {


	it('version', async () => {

		const config: any = {
			version: {
				files: [
					'./test-data/version/some.html',
					'./test-data/version/some.ts',
					'./test-data/version/some-2.ts',
					'./test-data/version/some.yaml'
				]
			}
		};

		await updateVersions(config);

		// we reset it back
		config.version.value = 'DROP-001';
		await updateVersions(config);

	});

});