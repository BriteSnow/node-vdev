#!/usr/bin/env node
var vdev = require("../vdev");

// var cmd = (process.argv.length >= 3)? process.argv[2] : null;

// var params = (process.argv.length >= 4)? process.argv.slice(3): [];


var cmds = {
	scaffold: function(basePackage,appName){
		vdev.scaffold.init("./", basePackage, appName);
	}
};

vdev.execCmd(cmds);