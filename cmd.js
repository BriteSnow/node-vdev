var vdev = require("./index.js");
// var vdev = require("vdev"); // assuming npm install git+https://git@github.com/BriteSnow/node-vdev.git

var dbPrefix = "vdev";
var appName = "vdev";

var sqlDir = "test/test-resources/sql/"; // for this test file
// var sqlDir = "src/main/webapp/WEB-INF/sql/"; // for dev
// var sqlDir = "jettybase/webapps/" + appName + "_war/WEB-INF/sql"; // for ops


// list of commands
var cmds = {
	
	recreateDb: function(){
		vdev.psql("postgres", null, "postgres", vdev.listSqlFiles(sqlDir,{to:0}));		
		vdev.psql(dbPrefix + "_user", null, dbPrefix + "_db", vdev.listSqlFiles(sqlDir,{from:1}));			
	}


};


// call the right command from the process.argv within this list of cmds functions
vdev.execCmd(cmds);


