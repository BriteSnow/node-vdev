var hbsp = require("hbsp");
var _db = require("./db.js");


module.exports = {
	// hbsp
	hbsp: hbsp, 
	
	// db related utils
	psql: _db.psql,
	listSqlFiles: _db.listSqlFiles,
	listNumberedFiles: _db.listNumberedFiles,

	execCmd: execCmd
	// gitUpdate: gitUpdate,
	// shutdownJetty: shutdownJetty,
	// startJetty: startJetty, 
	// readFirstLine: readFirstLine
};


// --------- Cmd Routing --------- //
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