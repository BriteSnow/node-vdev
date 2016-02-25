var shell = require("shelljs");
var path = require("path");
var fs = require("fs-extra");
var child_process = require("child_process");

var utils = require("./utils.js");
var git = require("./git.js");
var pg = require("./pg.js");

var opsUtils = utils.opsUtils;

var opsServerOrigin = "https://github.com/jeremychone/ops-server.git";

module.exports = {
	makeWarRepo: makeWarRepo,

	// from parent of serverDir
	makeServer: makeServer,

	// from serverDir
	startJetty: startJetty,
	stopJetty: stopJetty, 
	updateWar: updateWar,
	initDb: initDb, 
	makePostReceive: makePostReceive	
};

// --------- Public API: Server Making --------- //
function makeWarRepo(appName){		
	var warDir = opsUtils.getWarRepoDir(appName);
	
	if (utils.exists(warDir)){
		console.log(warDir + " already exists, assuming it is already setup correctly.");
		return;
	}
	
	// create the folder
	fs.mkdirsSync(warDir);

	// execute the git init
	var pwd = shell.pwd();
	shell.cd(warDir);
	shell.exec("git init --bar");
	shell.cd(pwd);
}

function makeServer(appName, warOrigin){
	// assert params
	if (!warOrigin){
		throw "need a git origin for the war folder";
	}

	// build config
	var config = {
		appName: appName,
		warOrigin: warOrigin
	};

	// build serverDir
	var serverDir = getServerDirFromParent(appName);		

	// if the serverDir already exist, do nothing, assume it is already setup. 
	if (utils.exists(serverDir)){
		console.log(`Serverdir "${serverDir}" already exist. Nothing to be done. To remake the server, remove this dir beforehand.`);
		return;
	}

	// create serverDir
	fs.mkdirsSync(serverDir);
	var configFile = opsUtils.getAppConfigFile(serverDir);
	utils.writeJson(configFile, config);

	// clone the template
	git.clone(serverDir,opsServerOrigin);
	fs.removeSync(path.join(serverDir,".git/"));
	fs.removeSync(path.join(serverDir,".gitignore"));

	// replace command for APPNAME template variable
	var replaceAppname = {rgx: /APPNAME/ig, val: config.appName};

	// webapps folder
	var webappsDir = opsUtils.getWebappsDir(config, serverDir);

	// rename and update the .xml
	var appnameXmlFile = path.join(webappsDir,config.appName + "_war.xml");
	fs.renameSync(path.join(webappsDir, "APPNAME_war.xml"), appnameXmlFile);
	utils.replaceInFiles(appnameXmlFile,replaceAppname);

	// rename and update the .properties
	var webappPropFile = opsUtils.getWebappPropFile(config,serverDir);
	fs.renameSync(path.join(webappsDir, "APPNAME_war.properties"), webappPropFile);
	utils.replaceInFiles(webappPropFile,replaceAppname);

	// create the webapp folder and clone the application war folder (from warOrigin)
	var webappDir = opsUtils.getWebappDir(config, serverDir);
	fs.mkdirsSync(webappDir);
	git.clone(webappDir,config.warOrigin);
}
// --------- /Public API: Server Making --------- //

// --------- Public API: Server Management --------- //
// if lenient, just log a warning if nothing to stop.
function stopJetty(lenient){
	return new Promise(resolve => {
		if (!utils.exists(getProcJsonFile())){
			console.log("File proc.json not found, so assuming no java/jetty process to stop. Stop jetty manually if already launched.");
			if (lenient){
				resolve(); // we do not fail if lenient is true.
			}else{
				throw {coce: "NO_PROC_JSON_FILE"};				
			}
		}

		var proc = utils.readJson(getProcJsonFile());

		if (proc.pid){ // would not not support proc.pid == 0, but should never be the case anyway.
			var killProc = child_process.spawn("kill",["-9", proc.pid]);
			killProc.stdout.on('data', (data) => console.log(`stdout: ${data}`));
			killProc.stderr.on('data', (data) => console.log(`stderr: ${data}`));
			killProc.on('exit', (exitCode) => {
				if (exitCode === 0){
					console.log("Successfull kill", exitCode);
					console.log("Deleting ", getProcJsonFile());
					fs.removeSync(getProcJsonFile());
					resolve({exitCode: exitCode, proc: killProc});
				}else{
					console.log("Failed kill", exitCode, ". If process does not exist, do 'rm proc.json' to remove the old pid information.");
					throw {exitCode: exitCode, proc: killProc};
				}
			});

		}
	});

	// TODO: later we might want ot use the Jetty way to stop server
	// start with stop port: java -jar start.jar STOP.PORT=28282 STOP.KEY=secret
	// stop using the stop port: java -jar start.jar STOP.PORT=28282 STOP.KEY=secret --stop
}

function startJetty(){
	var serverDir = getServerDir();
	console.log("serverDir", serverDir);
	var p = new Promise(function(resolve){

		// check if the proceJsonFile exist, if yes, reject
		if (utils.exists(getProcJsonFile())){
			console.log("File proc.json exists, so java process might be already running. Either remove proc.json or do 'node server stop'");
			throw {code:"ALREADY_PROC_JSON_FILE"};
		}

		var jettybaseDir = opsUtils.getJettybaseDir(serverDir);


		var startSuccessRegx = /Server.*\sStarted\s@\d*ms/g;

		// build the command and execute
		var cmd = ["java", "-jar", get_JETTY_HOME() + "start.jar"].join(" ");	
		console.log("Will execute >> ", cmd, "\n\t from dir: ", jettybaseDir);
		var proc = child_process.spawn("java",["-jar", get_JETTY_HOME() + "start.jar"],{cwd: jettybaseDir});

		function pipeOutput(outputType, data){
			data = new String(data).trim();
			if (data.length > 0){			
				console.log(`std${outputType}: ${data}`);	

				// when match "...oejs.Server:main: Started @...ms" we print the success, and if pass, press resolve
				if (startSuccessRegx.test(data)){
					console.log("devops message >>> Jetty Server succesfully started!!!!");
					console.log("devops message >>> Writing pid ", proc.pid, " to ", getProcJsonFile());
					utils.writeJson(getProcJsonFile(), {pid: proc.pid});
					resolve({proc:proc});			
				}
				// TODO: need to test a fail condition. Right now, it will hang.
			}				
		}

		proc.stdout.on('data', (data) => pipeOutput("out", data));
		proc.stderr.on('data', (data) => pipeOutput("err", data));		

		console.log("shell.exec >>>>" + proc.pid);		
	});

	return p;

}
// --------- /Public API: Server Management --------- //

// --------- Public API: Server DB Management --------- //
// Note: for now, assume localhost:5432 and appname_db & appname_user/welcome
function initDb(){
	
	console.log(getServerDir());
	return new Promise(function(resolve){
		// Assume the serverDir is the current dir
		var serverDir = getServerDir();

		var config = opsUtils.readAppConfig(serverDir);
		
		var appName = config.appName;



		// get teh sqlDir
		var sqlDir = opsUtils.getSqlDir(config, serverDir);
		
		// copy the createDb source file to modify the database and user name 
		var createDbSrcFile = pg.listSqlFiles(sqlDir, {to: 0})[0];
		var createDbFile = path.join(serverDir,"00_create-db.sql");
		fs.copySync(createDbSrcFile,createDbFile);

		var dbName = appName + "_db";
		var dbUser = appName + "_user";

		// replace the db name and username
		var replaceDbCred = [{rgx: /\w*_db/ig, val: dbName},{rgx: /\w*_user/ig, val: dbUser}];
		utils.replaceInFiles(createDbFile, replaceDbCred);

		pg.psqlImport({user: "postgres", db: "postgres"}, createDbFile);
		pg.psqlImport({user: dbUser, db: dbName}, pg.listSqlFiles(sqlDir, {from: 1}));		

		resolve();
	});

}
// --------- /Public API: Server DB Management --------- //

// --------- Public API: Others --------- //
function makePostReceive(){
	var serverDir = getServerDir();
	var config = opsUtils.readAppConfig(serverDir);

	var content = '#!/bin/bash\n' +
								'echo "---------from bash post receive"\n' +
								'source /home/ec2-user/.bash_profile\n' +
								'cd ' + serverDir + '\n' +
								'node server fullUpdate\n';

	var appRepoDir = opsUtils.getAppRepoDir(config);

	// check if the directory exist
	if (!utils.exists(appRepoDir)){
		throw "App git repo dir " + appRepoDir + " is not setup, please, setup first with '/store/node ops makeAppRepo APPNAME'";
	}

	var postReceiveFile = path.join(appRepoDir, "/hooks/post-receive");
	fs.writeFileSync(postReceiveFile, content, 'utf8');	
	fs.chmodSync(postReceiveFile,'770');

}

function updateWar(){
	var serverDir = getServerDir();
	var config = opsUtils.readAppConfig(serverDir);	

	return new Promise(resolve => {		

		var webappDir = opsUtils.getWebappDir(config, serverDir);
		console.log("will exec >>" + webappDir + "/git pull");
		// NOTE: adde the GIT_DIR to make sure that when called from post-receive we do not get the ". not a git directory"
		var proc = child_process.spawn("git",["pull"],{cwd: webappDir, env: {GIT_DIR: webappDir + "/.git"}});

		proc.stdout.on('data', (data) => console.log(`git pull message: ${data}`));
		proc.stderr.on('data', (data) => console.log(`git pull error: ${data}`));

		proc.on('exit', (exitCode) => {
			if (exitCode === 0){
				console.log("Successfull git pull", exitCode);
				resolve({exitCode: exitCode, proc: proc});
			}else{
				console.log("Failed git pull", exitCode);
				throw {exitCode: exitCode, proc: proc};
			}
		});
	});
} 
// --------- /Public API: Others --------- //

// --------- private --------- //
function getServerDir(){
	return path.resolve("./");
}

function getServerDirFromParent(appName){
	return path.resolve("./", appName + "_server");
}

function getProcJsonFile(){
	return path.join(getServerDir(), "proc.json");
}

function get_JETTY_HOME(){
	if (!process.env.JETTY_HOME){
		throw "JETTY_HOME environment variable not found";
	}
	return process.env.JETTY_HOME;
}
// --------- /private --------- //