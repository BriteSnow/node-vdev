var spawn = require("p-spawn");
var fs = require("fs-extra-plus");

module.exports = {
	clone: clone, 
	currentBranch: currentBranch
};

async function currentBranch(dir){
	var args = ["rev-parse","--abbrev-ref","HEAD"];
	var r = await spawn("git", args, {cwd:dir, capture:["stdout","stderr"]});
	return r.stdout;
}


async function clone(dir, origin, dest){

	// make sure the base directory exist
	await fs.mkdirs(dir);	

	// if there is a "dest" param, then, just do the git clone with this destination path
	if (dest && (dest !== "./" || dest !== ".")){
		let args = ["clone", origin, dest].join(" ");
		await spawn("git", args, {cwd: dir});
	}
	// otherwise, we assume it is in dir and we do the git init/remote-add/fetch/checkout to allow
	// doing a clone in a non-empty folder
	else{		
		await spawn("git", ["init"],  {cwd: dir});
		await spawn("git", ["remote", "add", "origin", origin],  {cwd: dir});
		await spawn("git", ["fetch"],  {cwd: dir});
		await spawn("git", ["checkout", "-t", "origin/master"],  {cwd: dir});
	}

}