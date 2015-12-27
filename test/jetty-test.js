var fs = require("fs-extra");
var path = require("path");
var vdev = require('../index');

describe('jetty-test', function() {

	// it('test-server-clone', function(done) {
	// 	this.timeout(15000);
	// 	var testServerDir = "./test/test-out/test-server";

	// 	// clean the jetty folder
	// 	fs.removeSync(testServerDir);

	// 	// create the jetty setup
	// 	vdev.setupServer(testServerDir);
	// 	vdev.downloadWebapp(testServerDir, "TODO: need to put github origin of a war");
	// 	done();
	// });

});


// recreateDb
// sqlDir = path.resolve(testServerDir,"jettybase/webapps/webapp/WEB-INF/sql");
// vdev.psql("postgres", null, "postgres", vdev.listSqlFiles(sqlDir,{to:0}));		
// vdev.psql("isonas_user", null, "isonas_db", vdev.listSqlFiles(sqlDir,{from:1}));	

// startJetty
// vdev.startJetty(testServerDir,true).then(function(r){
// 	console.log("!!!!!! startJetty done");
// });


