const fs = require("fs-extra-plus");
const spawn = require("p-spawn");
const assert = require("assert");
const vdev = require("../index.js");

const git = vdev.git;

describe("git-test", async function() {

	it("git-test-clone", async function() {
		await fs.remove("test/test-out/git-test");

		await git.clone("test/test-out/git-test/first-clone", "git@github.com:mvdom/mvdom-patterns.git");

	}).timeout(5000);	

	it("git-test-currentBranch", async function() {
		var dir = "test/test-out/git-test/first-clone";
		var exists = await fs.pathExists(dir);
		if(exists){
			var testName = "test-branch";

			var txt = await git.currentBranch(dir);	
			if (txt !== testName){
				await spawn("git", ["checkout", "-b", "test-branch"],{cwd: dir});
			}
			txt = await git.currentBranch(dir);	
			assert.equal(txt, testName, "branch name");
		}else{
			throw new Error(`Cannot check currentBranch because path does not exist '${dir}'`);
		}
	}).timeout(5000);	

});