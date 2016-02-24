var ops = require("./ops.js");

//////
// This module is made to be function called for command lines with vdev ... (and can be extended from custom scripts, like local server.js)
//////


module.exports = {
	scaffold: scaffold, 
	makeServer: makeServer, 
	makeWarRepo: makeWarRepo,
	makePostReceive: makePostReceive,
	updateWar: updateWar,
	initDb: initDb,
	startJetty: startJetty,
	stopJetty: stopJetty
};


function scaffold(basePackage,appName){
	vdev.scaffold.init("./", basePackage, appName);
}

// --------- Ops Server ParentDir --------- //
function makeServer(appName, warOrigin){
	ops.makeServer(appName, warOrigin);
} 

function makeWarRepo(appName){
	ops.makeWarRepo(appName);
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
	ops.startJetty().then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});

}

function stopJetty(){
	ops.stopJetty().then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});
}
// --------- /Ops ServerDir --------- //



