var shell = require("shelljs");
var path = require("path");
var fs = require("fs-extra");

module.exports = {
	gitClone: gitClone, 
	gitCurrentBranch: gitCurrentBranch
};

function gitCurrentBranch(){
	var cmd = ["git","rev-parse","--abbrev-ref","HEAD"];
	return shell.exec(cmd.join(" ")).output;
}

function gitClone(dir, origin, dest){
	var pwd = shell.pwd();

	shell.cd(dir);

	var gitCmd = ["git", "clone", origin, dest].join(" ");
	shell.exec(gitCmd);

	shell.cd(pwd);	
}