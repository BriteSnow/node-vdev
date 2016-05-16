var shell = require("shelljs");
var fs = require("fs-extra");

module.exports = {
	clone: clone, 
	currentBranch: currentBranch
};

function currentBranch(){
	var cmd = ["git","rev-parse","--abbrev-ref","HEAD"];
	return shell.exec(cmd.join(" ")).output;
}

function clone(dir, origin, dest){
	var pwd = shell.pwd();

	// make sure the base directory exist
	fs.mkdirsSync(dir);

	shell.cd(dir);

	// if there is a "dest" param, then, just dot he git clone with this destination path
	if (dest && (dest !== "./" || dest !== ".")){
		var gitCmd = ["git", "clone", origin, dest].join(" ");

		shell.exec(gitCmd);
	}
	// otherwise, we assume it is in dir and we do the git init/remote-add/fetch/checkout to allow
	// doing a clone in a non-empty folder
	else{		
		shell.exec("git init");
		shell.exec("git remote add origin " + origin);
		shell.exec("git fetch");
		shell.exec("git checkout -t origin/master");
	}

	// TODO: problably need to put it in the 'finally' of try/catch
	shell.cd(pwd);	
}