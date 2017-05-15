var ops = require("./ops.js");
var _scaffold = require("./scaffold.js");

//////
// This module is made to be function called for command lines with vdev ... (and can be extended from custom scripts, like local server.js)
//////

module.exports = {
	setupEc2Install, 
	scaffold, makeServer, makeWarRepo, makePostReceive,
	updateWar, initDb, startJetty, stopJetty
};



async function setupEc2Install(dir){
	return await ops.setupEc2Install(dir);
}


async function scaffold(basePackage, appName){
	return await _scaffold.init("./", basePackage, appName);
}

// --------- Ops Server ParentDir --------- //
async function makeServer(parentServerDir, appName, warOrigin){
	await ops.makeServer(parentServerDir, appName, warOrigin);
}

async function makeWarRepo(parentRepoDir, baseRepoName){
	await ops.makeWarRepo(parentRepoDir, baseRepoName);
} 
// --------- /Ops Server ParentDir --------- //

// --------- Ops ServerDir --------- //
async function makePostReceive(serverDir){
	ops.makePostReceive(serverDir);
}

async function updateWar(serverDir){
	ops.updateWar().then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});
}

async function initDb(serverDir){	
	ops.initDb().then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});
}

async function startJetty(serverDir){
	return ops.startJetty(serverDir).then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});

}

async function stopJetty(serverDir){
	return ops.stopJetty(serverDir).then(() => process.exit(0))
			.catch(err => {
				console.log("error: ", err);
				process.exit(1);
			});
}
// --------- /Ops ServerDir --------- //



