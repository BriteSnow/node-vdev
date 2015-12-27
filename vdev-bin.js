#!/usr/bin/env node
var vdev = require("../vdev");

// var cmd = (process.argv.length >= 3)? process.argv[2] : null;

// var params = (process.argv.length >= 4)? process.argv.slice(3): [];


var cmds = {
	scaffold: function(appName,shortName){
		console.log("appNamaaaae", appName, "shortName", shortName);
		vdev.scaffold.init("./", "io.briteteam", "briteteam");
	}
};

vdev.execCmd(cmds);