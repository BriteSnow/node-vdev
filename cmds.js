var ops = require("./ops.js");
var _scaffold = require("./scaffold.js");

//////
// This module is made to be function called for command lines with vdev ... (and can be extended from custom scripts, like local server.js)
//////

module.exports = {
	scaffold, makeServer, makeWarRepo, makePostReceive,
	updateWar, initDb, startJetty, stopJetty
};


function scaffold(basePackage,appName){
	return _scaffold.init("./", basePackage, appName);
}

// --------- Ops Server ParentDir --------- //
function makeServer(appName, warOrigin){
	return ops.makeServer(appName, warOrigin);
} 

function makeWarRepo(appName){
	return ops.makeWarRepo(appName);
} 
// --------- /Ops Server ParentDir --------- //

// --------- Ops ServerDir --------- //
function makePostReceive(){
	ops.makePostReceive();
}

function updateWar(){
	ops.updateWar().then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});
}

function initDb(){	
	ops.initDb().then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});
}

function startJetty(){
	return ops.startJetty().then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});

}

function stopJetty(){
	return ops.stopJetty().then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});
}
// --------- /Ops ServerDir --------- //



