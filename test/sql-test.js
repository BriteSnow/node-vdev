var vdev = require('../index');
var fs = require("fs-extra-plus");


describe('sql-test-pg.psqlImport', function() {

	it('vdev.pg.psqlImport create base db', async function() {
		// Drop and Recreate "vdev_db" and "vdev_user"

		await vdev.pg.psqlImport({user:"postgres", db:"postgres"}, await fs.listFiles("test/test-resources/sql/",{to:0, suffix:".sql"}));		
		// Create vdev_db schema
		await vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, await fs.listFiles("test/test-resources/sql/",{from:1, suffix:".sql"}));		
	});	

	it('vdev.pg.psqlImport create and seed', async function() {
		// Drop and Recreate "vdev_db" and "vdev_user"
		await vdev.pg.psqlImport({user:"postgres", db:"postgres"}, await fs.listFiles("test/test-resources/sql/",{to:0, suffix:".sql"}));		
		// Create vdev_db schema
		await vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, await fs.listFiles("test/test-resources/sql/",{from:1, suffix:".sql"}));		

		// Seed vdev_db
		await vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, "test/test-resources/sql/seed-db.sql");
	});	

});

describe('sql-test-pg.psqlExport', function() {

	it('vdev.pgExport create, seed, export', async function() {
		// Drop and Recreate "vdev_db" and "vdev_user"
		await vdev.pg.psqlImport({user:"postgres", db:"postgres"}, await fs.listFiles("test/test-resources/sql/",{to:0}));		
		// Create vdev_db schema
		await vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, await fs.listFiles("test/test-resources/sql/",{from:1}));		

		// Seed vdev_db
		await vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, "test/test-resources/sql/seed-db.sql");

		// Export vdev_db (with password)
		await vdev.pg.psqlExport({user:"vdev_user", pwd:"welcome", db:"vdev_db"}, "test/test-out/vdev-db-out.sql");

	});	

});