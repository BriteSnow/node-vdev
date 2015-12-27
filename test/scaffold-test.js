var vdev = require('../index');
var chai = require('chai');
var fs = require("fs-extra");
var path = require("path");
var assert = chai.assert;

var baseOutDir = "./test/test-out/scaffold-test/";

describe('scaffold-test', function() {

	it('init', function(done) {
		this.timeout(15000);
		fs.removeSync(baseOutDir);
		fs.mkdirsSync(baseOutDir);

		// create the dev folder 
		// (to make sure it can do the clone even if the folder is not empty)
		fs.mkdirsSync(path.join(baseOutDir,"dev"));

		vdev.scaffold.init(baseOutDir,"io.testapp", "testApplication");
		done();
	});
	
});

