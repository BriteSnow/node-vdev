var gulp = require("gulp");
var vdev = require('../index');
var chai = require('chai');
var assert = chai.assert;

describe('listSqlFiles', function() {

	it('listSqlFiles all sql files', function() {
		var paths = vdev.listSqlFiles("test/test-resources/sql/");
		assert.equal(paths.length, 5);
	});

	it('listSqlFiles 0 to 2', function() {
		var paths = vdev.listSqlFiles("test/test-resources/sql/",{to: 2});
		assert.equal(paths.length, 3);
	});	

	it('listSqlFiles from 1', function() {
		var paths = vdev.listSqlFiles("test/test-resources/sql/",{from: 1});
		assert.equal(paths.length, 4);
	});		

	it('listSqlFiles DROP 22 until 23', function() {
		var paths = vdev.listSqlFiles("test/test-resources/sql/",{from:22, to: 23, numRegExp: /DROP-(\d+)/});
		assert.equal(paths.length, 3);
	});

});

describe('psql', function() {

	// it('00_create-db.sql run', function() {
	// 	vdev.psqlExecFile("postgres", null, "postgres", "test/test-resources/sql/00_create-db.sql");		
	// });

	// it('[00_create-db.sql] run', function() {
	// 	vdev.psqlExecFile("postgres", null, "postgres", ["test/test-resources/sql/00_create-db.sql"]);		
	// });

	it('Run numbered sql files', function() {
		vdev.psql("postgres", null, "postgres", vdev.listSqlFiles("test/test-resources/sql/",{to:0}));		
		vdev.psql("vdev_user", null, "vdev_db", vdev.listSqlFiles("test/test-resources/sql/",{from:1}));		
	});	


});