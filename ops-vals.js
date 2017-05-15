const path = require("path");


module.exports = {
	serverDir, sqlDir, webappsDir, webappDir, 
	webappPropFile, warRepoDir, appConfigFile, jettybaseDir, procFile
};



function serverDir(parentDir, appName){
	return path.resolve(parentDir, appName + "_server");
}

function sqlDir(serverDir, config){
	return path.resolve(webappDir(serverDir, config),"WEB-INF/sql/");
}

function webappDir(serverDir, config){
	return path.join(webappsDir(serverDir), config.appName + "_war");
}

function webappsDir(serverDir){
	return path.join(serverDir,"/jettybase/webapps/");
}

function webappPropFile(serverDir, config){
	var wappsDir = webappsDir(serverDir);
	return path.join(wappsDir, config.appName + "_war.properties");
}

function warRepoDir(parentDir, repoBaseName){
	if (parentDir == null || repoBaseName == null){
		throw new Error(`warRepoDir needs a parentDir and repoBaseName, right now got ${parentDir} and ${repoBaseName}`);
	}
	return path.resolve(parentDir, repoBaseName + "_war");
}

function appConfigFile(serverDir){
	return path.join(serverDir,"appconfig.json");
}

function jettybaseDir(serverDir){
	return path.join(serverDir,"jettybase/");
}

function procFile(serverDir){
	return path.join(serverDir, "proc.json");
}