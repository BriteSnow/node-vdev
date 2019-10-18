import { deepEqual } from 'assert';
import { loadRealms } from '../src/realm';


describe('realm', async () => {

	it('realm-load', async () => {
		const vdevObj = await loadRealms('./test-data/app_dir');

		// Test that array is overriden
		deepEqual(vdevObj.realm_01.defaultConfigurations, ['srv.yaml']);
		deepEqual(vdevObj.realm_02.defaultConfigurations, ['srv2.yaml']);

	});

});