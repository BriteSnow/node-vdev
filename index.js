var _db = require("./db.js");
var _jetty = require("./jetty.js");
var _drop = require('./drop.js');
var _git = require('./git.js');

module.exports = {
	
	// db related utils
	psql: _db.psql,
	listSqlFiles: _db.listSqlFiles,
	listNumberedFiles: _db.listNumberedFiles,

	// server related utils
	setupServer: _jetty.setupServer,
	startJetty: _jetty.startJetty,
	downloadWebapp: _jetty.downloadWebapp, 

	// drop utils
	getVarStringValue: _drop.getVarStringValue, 
	saveVarStringValue: _drop.saveVarStringValue, 
	incDropVersion: _drop.incDropVersion,

	// git 
	gitClone: _git.gitClone,
	gitCurrentBranch: _git.gitCurrentBranch,

	execCmd: execCmd
	// gitUpdate: gitUpdate,
	// shutdownJetty: shutdownJetty,
	// startJetty: startJetty, 
	// readFirstLine: readFirstLine
};


// --------- Cmd Routing --------- //

// route the exec command to one of the method in the cmds. 
function execCmd(cmds){
	var cmd = (process.argv.length >= 3)? process.argv[2] : null;

	if (!cmd){
		printCmds();
	}else{
		var func = cmds[cmd];
		if (func){
			//console.log(" will execute cmd ", cmd);
			// TODO: probably need to slice the remaining arguments as parameters
			func.call();
		}else {
			console.log("wrong command '" + cmd + "'");
			printCmds();
		}	
	}

	function printCmds(){
		var msg = "commands are:";
		for (var label in cmds){
			msg += "\n\t" + label;
		}
		console.log(msg);
	}	
}

// --------- /Cmd Routing --------- //