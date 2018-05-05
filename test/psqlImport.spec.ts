
import { spawn } from 'p-spawn';
import * as assert from 'assert';

import { psqlImport, pgStatus, pgTest } from '../src/psql';

describe('psqlImport', async () => {
	before(setupPgImage);
	after(closePgImage);

	it('pgStatus', async () => {
		const r = await pgStatus({ host: 'localhost' });
		assert.equal(r.accepting, true, 'pgStatus.accepting');
	})

	it('pgStatus nonexistent', async () => {
		const r = await pgStatus({ host: 'nonexistent' });
		assert.equal(r.accepting, false, 'pgStatus.accepting')
	});

	it('pgTest nonexistent vdev_db', async () => {
		const r = await pgTest({ db: 'vdev_db' });
		assert.equal(r.success, false, 'pg db vdev_db');
	});

	it('psqlImport 00-createDb.sql', async () => {
		const sqlFile = 'test-data/sql/00-createDb.sql';
		const r = await psqlImport({ toConsole: false }, [sqlFile]);
		assert.equal(r[0].file, sqlFile, 'r[0].file');
	});

	it('pgTest vdev_db', async () => {
		const r = await pgTest({ db: 'vdev_db' });
		assert.equal(r.success, true, 'pg db vdev_db');
	});

	it('pgTest nonexistent_db', async () => {
		const r = await pgTest({ db: 'nonexistent_db' });
		assert.equal(r.success, false, 'pg db nonexistent_db');
	});

	it('psqlImport 00-createDb.sql fail', async () => {
		const sqlFile = 'test-data/sql/00-createDb.sql';
		try {
			const r = await psqlImport({ toConsole: false }, [sqlFile]);
			assert.equal(r[0].file, sqlFile, 'r[0].file');
		} catch (ex) {
			assert.equal(ex.items.length, 1);
			assert.equal(ex.message.includes('already exists'), true);
		}
	});

});

async function wait(ms: number) {
	return new Promise(function (resolve, reject) {
		setTimeout(function () { resolve(); }, ms);
	});
}



// --------- Private Utils --------- //
async function setupPgImage(this: any) {
	this.timeout(5000);
	await spawn('docker', ['run', '-d', '-p', '5432:5432', '--name', 'vdev-pg', 'postgres:10.3-alpine'], { capture: 'stdout' });
	await wait(1000);
}
async function closePgImage() {
	await wait(123);
	await spawn('docker', ['stop', 'vdev-pg'], { capture: 'stdout' });
	await spawn('docker', ['rm', 'vdev-pg'], { capture: 'stdout' });
}
// --------- /Private Utils --------- //