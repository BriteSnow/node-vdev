
import { deepStrictEqual as equal } from 'assert';
import { spawn } from 'p-spawn';
import { wait } from 'utils-min';
import { pgStatus, pgTest, psqlCommand, psqlImport } from '../src/psql';

const DB_CRED = {
	host: 'localhost',
	database: 'postgres',
	user: 'postgres',
	password: 'postgres'
}

describe('psql', async function () {
	before(setupPgImage);
	after(closePgImage);

	it('psql-pgStatus-exist', async function () {
		const r = await pgStatus(DB_CRED);
		equal(r.accepting, true, 'psql-pgStatus-exist');
	})

	it('psql-pgStatus-nonexistent', async function () {
		this.timeout(5000); // take a longer time since wait for hostname to respond
		const r = await pgStatus({ host: 'nonexistent' });
		equal(r.accepting, false, 'pgStatus.accepting')
	});

	it('psql-pgTest-nonexistent', async () => {
		const r = await pgTest({ ...DB_CRED, ...{ host: 'noexistent_db' } });
		equal(r.success, false, 'pg db vdev_db');
	});

	it('psql-drop', async () => {
		const sqlFile = 'test-data/sql/_drop-if-exists.sql';
		const r = await psqlImport({ ...DB_CRED, ...{ toConsole: true } }, [sqlFile]);
		equal(r[0].file, sqlFile, 'r[0].file');
	});


	it('psql-psqlImport-00-createDb.sql', async () => {
		const sqlFile = 'test-data/sql/00-createDb.sql';
		const r = await psqlImport({ ...DB_CRED, ...{ toConsole: false } }, [sqlFile]);
		equal(r[0].file, sqlFile, 'r[0].file');
	});

	it('psql-psqlCommand', async () => {
		const r = await psqlCommand({ ...DB_CRED, ...{ toConsole: false } }, 'SELECT version()');
		equal(r.includes('PostgreSQL'), true, 'contains PostgreSQL');
	});

	it('psql-pgTest-vdev_db', async () => {
		const r = await pgTest(DB_CRED);
		equal(r.success, true, 'pg db vdev_db');
	});


	it('psql-psqlImport-00-createDb-fail', async () => {
		const sqlFile = 'test-data/sql/00-createDb.sql';
		try {
			const r = await psqlImport({ ...DB_CRED, ...{ toConsole: false } }, [sqlFile]);
			equal(r[0].file, sqlFile, 'r[0].file');
		} catch (ex) {
			equal(ex.items.length, 1);
			equal(ex.message.includes('already exists'), true);
		}
	});

});




// --------- Private Utils --------- //
async function setupPgImage(this: any) {
	this.timeout(5000);
	await spawn('docker', ['run', '--rm', '-d', '-p', '5432:5432', '-e', 'POSTGRES_PASSWORD=postgres', '--name', 'vdev-pg', 'postgres:12'], { capture: 'stdout' });
	await wait(3000);
}
async function closePgImage() {
	await wait(500);
	await spawn('docker', ['stop', 'vdev-pg'], { capture: 'stdout' });
	await wait(500);
}
// --------- /Private Utils --------- //