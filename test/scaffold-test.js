var vdev = require('../index');
var fs = require("fs-extra");
var path = require("path");

var baseOutDir = "./test/test-out/scaffold-test/";

describe('scaffold-test', function() {

	it('create', async function() {
		this.timeout(15000);

		await fs.remove(baseOutDir);
		await fs.mkdirs(baseOutDir);

		// create the dev folder 
		// (to make sure it can do the clone even if the folder is not empty)
		await fs.mkdirs(path.join(baseOutDir,"dev"));

		var opts = {
			src: "/Users/jeremychone/_jeremy/_projects/projectmvc/projectmvc_mvnsrc",
			dir: baseOutDir,
			package: "io.testapp",
			appName: "testApplication"
		};

		await vdev.scaffold.create(opts);
	});
	
});

