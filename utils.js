var path = require("path");
var fs = require("fs-extra");

module.exports = {
	exists: exists,
	readJson: readJson,
	writeJson: writeJson,
	replaceInFiles: replaceInFiles,
	ensureArray: ensureArray, 
	opsUtils: {
		getSqlDir: getSqlDir,
		getWebappsDir: getWebappsDir,
		getWebappDir: getWebappDir,
		getWebappPropFile: getWebappPropFile,
		getAppRepoDir: getAppRepoDir,
		readAppConfig: readAppConfig,
		getAppConfigFile: getAppConfigFile, 
		getJettybaseDir: getJettybaseDir
	}
};

// --------- Ops Utils --------- //
function getSqlDir(config, serverDir){
	return path.resolve(getWebappDir(config, serverDir),"WEB-INF/sql/");
}

function getWebappsDir(config, serverDir){
	return path.join(serverDir,"/jettybase/webapps/");
}

function getWebappDir(config, serverDir){
	return path.join(getWebappsDir(config,serverDir), config.appName + "_war");
}

function getWebappPropFile(config, serverDir){
	var webappsDir = getWebappsDir(config, serverDir);
	return path.join(webappsDir, config.appName + "_war.properties");
}

function getAppRepoDir(config){
	// for now, the app repos base is /store/gits/
	return path.resolve("/store/gits/", config.appName + "_war");
}

function readAppConfig(serverDir){
	return readJson(getAppConfigFile(serverDir));
}

function getAppConfigFile(serverDir){
	return path.join(serverDir,"appconfig.json");
}

function getJettybaseDir(serverDir){
	return path.join(serverDir,"jettybase/");
}
// --------- /Ops Utils --------- //



// --------- File Utils --------- //
function exists(path){
	try{
		fs.statSync(path);
		return true;
	}catch(err) {
		return false;
	}
}

function replaceInFiles(files, replaceCmds){
	files  = ensureArray(files);	
	replaceCmds = ensureArray(replaceCmds);

	var i, j, file, content, replaceCmd;
		
	for (i = 0; i < files.length; i++){
		file = files[i];
		content = fs.readFileSync(file, 'utf8');
		for (j = 0; j < replaceCmds.length; j++){
			replaceCmd = replaceCmds[j];
			content = content.replace(replaceCmd.rgx,replaceCmd.val);	
		}		
		fs.writeFileSync(file, content, 'utf8');		
	}		
}
// --------- /File Utils --------- //

// --------- json Utils --------- //
function readJson(file){
	var content = fs.readFileSync(file, 'utf8');
	var json = JSON.parse(content);
	return json;
}

function writeJson(file, jsonObj){
	var content = JSON.stringify(jsonObj, null, 4);
	fs.writeFileSync(file, content, 'utf8');	
}
// --------- /json Utils --------- //


// --------- Lang Utils --------- //
// if val is not an Array, it does make an array with val as the only element
function ensureArray(val){
	return Array.isArray(val)?val:[val];
}
// --------- /Lang Utils --------- //


