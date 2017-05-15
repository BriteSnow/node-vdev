const fs = require("fs-extra-plus");
const path = require("path");
const spawn = require("p-spawn");
const vdev = require("../index");
const ops = vdev.ops; 
const assert = require("assert");


const srcWarDir = "/Users/jeremychone/_jeremy/_projects/projectmvc/war";
const outDir = "./test/test-out/ops-test";
const serverDir = path.join(outDir, "pmvc_app_server");

var _warRepoDir = "/store/gits/test_pmvc_war";

describe("ops-test", function() {

	it("ops-test-makeWarRepo", async function(){

		// clean (make sure it is save to remove)
		if (_warRepoDir.endsWith("test_pmvc_war")){
			console.log("test-cleanup - will remove " + _warRepoDir);
			await fs.remove(_warRepoDir);
		}else{
			throw `Not safe to remove ${_warRepoDir}. STOPPING`;
		}


		var warRepoDir = await ops.makeWarRepo("test_pmvc");
		assert.equal(warRepoDir, _warRepoDir);

		// reset the target test repo (ingoreFail: true so that we do not get the exists errors)
		await spawn("git", ["remote", "remove", "test_pmvc"],{cwd: srcWarDir, ignoreFail: true});
		await spawn("git", ["remote", "add", "test_pmvc", warRepoDir], {cwd: srcWarDir, ignoreFail: true});

		// push the projectmvc ware there
		await spawn("git", ["push", "test_pmvc", "master"],{cwd: srcWarDir});
	});


	it("ops-test-makeServer", async function() {
		await fs.mkdirs(outDir);

		// cleanup
		console.log(`test-cleanup - will remove ${serverDir}`);
		await fs.remove(serverDir);

		// make the server dir
		await ops.makeServer(outDir, "pmvc_app", _warRepoDir);
	});

	it("ops-test-makePostReceive", async function() {
		await ops.makePostReceive(serverDir);
	});

	
	it("ops-test-initDb", async function() {

		// cleanup
		await ops.initDb(serverDir);

	});

	it("ops-test-updateWar", async function() {

		// cleanup
		await ops.updateWar(serverDir);

	});


	it("ops-test-startJetty", async function() {

		await ops.startJetty(serverDir);

	});	

	it("ops-test-stopJetty", async function() {

		var serverDir = path.join(outDir, "pmvc_app_server");

		await ops.stopJetty(serverDir);
		
	});		
});