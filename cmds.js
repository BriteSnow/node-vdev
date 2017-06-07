const fs = require("fs-extra-plus");
const path = require("path");
const ops = require("./ops.js");
const utils = require("./utils.js");
const _scaffold = require("./scaffold.js");

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


async function scaffold(){

	const scaffoldJsonFile = "scaffold.json";

	// if the scaffold file does not exist, create it, and ask the user to fill it up
	if (!await fs.pathExists(scaffoldJsonFile)){
		await fs.copy(path.join(__dirname, "templates/", "scaffold.json.tmpl"), scaffoldJsonFile);

		console.log("scaffold.json not found, created it. Please fill it up");
		return;
	}

	var scaffoldOpts = await utils.readJson("scaffold.json");
	if (!scaffoldOpts.package || !scaffoldOpts.appName){
		console.log(".package or .appName are not defined in the scaffold.json");
	}

	await _scaffold.create(scaffoldOpts);
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



