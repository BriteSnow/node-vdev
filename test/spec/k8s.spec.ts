import { loadRealms, templatize } from '../../src/realm';


describe('k8s', async () => {

	it('k8s-template', async () => {
		const vdevObj = await loadRealms('./test-data/app_dir');
		const realm_01 = vdevObj.realm_01;
		realm_01.context = '___TEST___NO_CONTEXT___';

		const result = await templatize(realm_01, 'srv');
		for (let item of result) {
			console.log(`Templatize resource '${item.name}' to '${item.path}'`);
		}
	});

});