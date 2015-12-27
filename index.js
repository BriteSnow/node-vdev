var _pg = require("./pg.js");
var _jetty = require("./jetty.js");
var _drop = require('./drop.js');
var _git = require('./git.js');
var _scaffold = require('./scaffold.js');

module.exports = {
	
	// db related utils
	pg: _pg,

	// server related utils
	jetty: _jetty,

	// drop utils
	drop: _drop,

	// git 
	git: _git,

	// scaffold
	scaffold: _scaffold,

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
	var params = (process.argv.length >= 4)? process.argv.slice(3): [];

	if (!cmd){
		printCmds();
	}else{
		var func = cmds[cmd];
		if (func){
			//console.log(" will execute cmd ", cmd);
			// TODO: probably need to slice the remaining arguments as parameters
			func.apply(null,params);
		}else {
			console.log("wrong command '" + cmd + "' is not a method");
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