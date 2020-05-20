
import * as assert from 'assert';
import { spawn } from 'p-spawn';
import { pgStatus, pgTest, psqlImport } from '../src/psql';

const DB_CRED = {
	host: 'localhost',
	database: 'postgres',
	user: 'postgres',
	pwd: 'postgres'
}

describe('psql', async () => {
	before(setupPgImage);
	after(closePgImage);

	it('psql-pgStatus-exist', async () => {
		const r = await pgStatus(DB_CRED);
		assert.equal(r.accepting, true, 'pgStatpsql-pgTest-nonexistent-vdev_db:us.accepting');
	})

	it('psql-pgStatus-nonexistent', async () => {
		const r = await pgStatus({ host: 'nonexistent' });
		assert.equal(r.accepting, false, 'pgStatus.accepting')
	});

	it('psql-pgTest-nonexistent', async () => {
		const r = await pgTest({ ...DB_CRED, ...{ host: 'noexistent_db' } });
		assert.equal(r.success, false, 'pg db vdev_db');
	});

	it('psql-psqlImport-00-createDb.sql', async () => {
		const sqlFile = 'test-data/sql/00-createDb.sql';
		const r = await psqlImport({ ...DB_CRED, ...{ toConsole: false } }, [sqlFile]);
		assert.equal(r[0].file, sqlFile, 'r[0].file');
	});

	it('psql-pgTest-vdev_db', async () => {
		const r = await pgTest(DB_CRED);
		assert.equal(r.success, true, 'pg db vdev_db');
	});


	it('psql-psqlImport-00-createDb-fail', async () => {
		const sqlFile = 'test-data/sql/00-createDb.sql';
		try {
			const r = await psqlImport({ ...DB_CRED, ...{ toConsole: false } }, [sqlFile]);
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
	await spawn('docker', ['run', '-d', '-p', '5432:5432', '-e', 'POSTGRES_PASSWORD=postgres', '--name', 'vdev-pg', 'postgres:12'], { capture: 'stdout' });
	await wait(1000);
}
async function closePgImage() {
	await wait(123);
	await spawn('docker', ['stop', 'vdev-pg'], { capture: 'stdout' });
	await spawn('docker', ['rm', 'vdev-pg'], { capture: 'stdout' });
}
// --------- /Private Utils --------- //