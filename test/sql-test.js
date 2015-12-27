var gulp = require("gulp");
var vdev = require('../index');
var chai = require('chai');
var assert = chai.assert;

describe('sql-test-listSqlFiles', function() {

	it('listSqlFiles all sql files', function() {
		var paths = vdev.pg.listSqlFiles("test/test-resources/sql/");
		assert.equal(paths.length, 5);
	});

	it('listSqlFiles 0 to 2', function() {
		var paths = vdev.pg.listSqlFiles("test/test-resources/sql/",{to: 2});
		assert.equal(paths.length, 3);
	});	

	it('listSqlFiles from 1', function() {
		var paths = vdev.pg.listSqlFiles("test/test-resources/sql/",{from: 1});
		assert.equal(paths.length, 4);
	});		

	it('listSqlFiles DROP 22 until 23', function() {
		var paths = vdev.pg.listSqlFiles("test/test-resources/sql/",{from:22, to: 23, numRegExp: /DROP-(\d+)/});
		assert.equal(paths.length, 3);
	});

});

describe('sql-test-pg.psqlImport', function() {

	it('vdev.pg.psqlImport create base db', function() {
		// Drop and Recreate "vdev_db" and "vdev_user"
		vdev.pg.psqlImport({user:"postgres", db:"postgres"}, vdev.pg.listSqlFiles("test/test-resources/sql/",{to:0}));		
		// Create vdev_db schema
		vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, vdev.pg.listSqlFiles("test/test-resources/sql/",{from:1}));		
	});	

	it('vdev.pg.psqlImport create and seed', function() {
		// Drop and Recreate "vdev_db" and "vdev_user"
		vdev.pg.psqlImport({user:"postgres", db:"postgres"}, vdev.pg.listSqlFiles("test/test-resources/sql/",{to:0}));		
		// Create vdev_db schema
		vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, vdev.pg.listSqlFiles("test/test-resources/sql/",{from:1}));		

		// Seed vdev_db
		vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, "test/test-resources/sql/seed-db.sql");
	});	

});

describe('sql-test-pg.psqlExport', function() {

	it('vdev.pgExport create, seed, export', function() {
		// Drop and Recreate "vdev_db" and "vdev_user"
		vdev.pg.psqlImport({user:"postgres", db:"postgres"}, vdev.pg.listSqlFiles("test/test-resources/sql/",{to:0}));		
		// Create vdev_db schema
		vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, vdev.pg.listSqlFiles("test/test-resources/sql/",{from:1}));		

		// Seed vdev_db
		vdev.pg.psqlImport({user:"vdev_user", db:"vdev_db"}, "test/test-resources/sql/seed-db.sql");

		// Export vdev_db (with password)
		vdev.pg.psqlExport({user:"vdev_user", pwd:"welcome", db:"vdev_db"}, "test/test-out/vdev-db-out.sql");

	});	

});

//// Deprecated

describe('sql-test-psql', function() {

	it('vdev.psql exec', function() {
		vdev.pg.psql("postgres", null, "postgres", vdev.pg.listSqlFiles("test/test-resources/sql/",{to:0}));		
		vdev.pg.psql("vdev_user", null, "vdev_db", vdev.pg.listSqlFiles("test/test-resources/sql/",{from:1}));		
	});	

});