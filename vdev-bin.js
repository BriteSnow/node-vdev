#!/usr/bin/env node
var vdev = require("../vdev");

var ops = vdev.ops;

// var cmd = (process.argv.length >= 3)? process.argv[2] : null;

// var params = (process.argv.length >= 4)? process.argv.slice(3): [];


var cmds = {
	scaffold: function(basePackage,appName){
		vdev.scaffold.init("./", basePackage, appName);
	}, 

	// --------- Ops Server ParentDir --------- //
	makeServer: function(appName, warOrigin){
		ops.makeServer(appName, warOrigin);
	}, 

	makeWarRepo: function(appName){
		ops.makeWarRepo(appName);
	}, 
	// --------- /Ops Server ParentDir --------- //

	// --------- Ops ServerDir --------- //
	makePostReceive: function(){
		ops.makePostReceive();
	},

	initDb: function(){	
		ops.initDb().then(() => process.exit(0))
				.catch(err => {
					console.log("error: ", err);
					process.exit(1);
				});
	},

	startJetty: function(){
		ops.startJetty().then(() => process.exit(0))
				.catch(err => {
					console.log("error: ", err);
					process.exit(1);
				});

	}, 

	stopJetty: function(){
		ops.stopJetty().then(() => process.exit(0))
				.catch(err => {
					console.log("error: ", err);
					process.exit(1);
				});
	},
	// --------- /Ops ServerDir --------- //


	test: function(){
		console.log("vdev test called");
	}
};

vdev.execCmd(cmds);