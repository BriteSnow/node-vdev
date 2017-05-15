var path = require("path");
var fs = require("fs-extra-plus");
var spawn = require("p-spawn");

var _spawn = require('child_process').spawn;

var utils = require("./utils.js");
var git = require("./git.js");
var pg = require("./pg.js");

var opsVals = require("./ops-vals.js");

//var opsServerOrigin = "https://github.com/jeremychone/ops-server.git";

var templatesDir = path.join(__dirname, "templates");

module.exports = {
	makeWarRepo,

	// from parent of serverDir
	makeServer,

	// from serverDir
	startJetty,
	stopJetty, 
	updateWar,
	initDb, 
	makePostReceive	
};

// --------- Public API: Server Making --------- //
async function makeWarRepo(appName){		
	var warRepoDir = opsVals.warRepoDir(appName);
	
	if (fs.pathExistsSync(warRepoDir)){
		console.log(warRepoDir + " already exists, assuming it is already setup correctly.");
		return warRepoDir;
	}
	
	// create the folder
	await fs.mkdirs(warRepoDir);

	// execute the git init
	await spawn("git", ["init", "--bar"], {cwd: warRepoDir});

	return warRepoDir;
}

async function makeServer(parentDir, appName, warOrigin){
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
	var serverDir = opsVals.serverDir(parentDir, appName);		

	// if the serverDir already exist, do nothing, assume it is already setup. 
	if (fs.pathExistsSync(serverDir)){
		console.log(`Serverdir "${serverDir}" already exist. Nothing to be done. To remake the server, remove this dir beforehand.`);
		return;
	}

	// create serverDir
	await fs.mkdirs(serverDir);
	var configFile = opsVals.appConfigFile(serverDir);
	await fs.writeJson(configFile, config);

	// copy the template
	await fs.copy(path.join(templatesDir, "server"), serverDir);

	// replace command for APPNAME template variable
	var replaceAppname = {rgx: /APPNAME/ig, val: config.appName};

	// webapps folder
	var webappsDir = opsVals.webappsDir(serverDir, config);

	// rename and update the .xml
	var appnameXmlFile = path.join(webappsDir,config.appName + "_war.xml");
	await fs.rename(path.join(webappsDir, "APPNAME_war.xml"), appnameXmlFile);
	await utils.replaceInFiles(appnameXmlFile,replaceAppname);

	// rename and update the .properties
	var webappPropFile = opsVals.webappPropFile(serverDir, config);
	await fs.rename(path.join(webappsDir, "APPNAME_war.properties"), webappPropFile);
	await utils.replaceInFiles(webappPropFile,replaceAppname);

	// create the webapp folder and clone the application war folder (from warOrigin)
	var webappDir = opsVals.webappDir(serverDir, config);
	await fs.mkdirs(webappDir);

	await git.clone(webappDir,config.warOrigin);
}
// --------- /Public API: Server Making --------- //

// --------- Public API: Server Management --------- //

async function startJetty(serverDir, opts){
	// if we do not have serverDir, 
	if (typeof serverDir !== "string"){
		serverDir = "./";
		opts = serverDir;
	}

	console.log("serverDir: ", serverDir);

	// check if the proceJsonFile exist, if yes, reject
	if (fs.pathExistsSync(opsVals.procFile(serverDir))){
		console.log("File proc.json exists, so java process might be already running. Either remove proc.json or do 'node server stop'");
		throw {code:"ALREADY_PROC_JSON_FILE"};
	}

	var jettybaseDir = opsVals.jettybaseDir(serverDir);


	//var startSuccessRegx = /Server.*\sStarted\s@\d*ms/g;

	// build the command and execute
	var args = ["-jar", get_JETTY_HOME() + "/start.jar"];	
	console.log("Will execute >>  java" + args.join(" ") + "\n\tfrom dir: ", jettybaseDir);

	// prepare the log files
	var logDir = path.join(serverDir, "/logs/");
	await fs.mkdirs(logDir);
	var logFile = path.join(logDir, "jetty.log");
	await fs.unlinkFiles([logFile]);
	var out = fs.openSync(logFile, "a");
	var err = fs.openSync(logFile, "a");

	console.log(`\tlog file: ${logFile}`);

	// spawn the process
	var ps = _spawn("java", args, {cwd: jettybaseDir, stdio: [ 'ignore', out, err ], detached: true});
	console.log("spawn >>>> " + ps.pid);

	var proc = {pid: ps.pid};
	await fs.writeJson(opsVals.procFile(serverDir), proc);

	ps.unref();
	
}
// --------- /Public API: Server Management --------- //


// if lenient, just log a warning if nothing to stop.
async function stopJetty(serverDir, opts){
	// if we do not have serverDir, 
	if (typeof serverDir !== "string"){
		serverDir = "./";
		opts = serverDir;
	}

	var procFile = opsVals.procFile(serverDir);

	if (!fs.pathExistsSync(procFile)){
		console.log("File proc.json not found, so assuming no java/jetty process to stop. Stop jetty manually if already launched.");
		return; // we do not fail
	}

	var proc = await fs.readJson(procFile);

	if (proc.pid){ // would not not support proc.pid == 0, but should never be the case anyway.
		try{

			var killProc = await spawn("kill",["-9", proc.pid]);

			if (killProc.code === 0){
				console.log("Successfull kill");
				console.log("Deleting ", procFile);
				await fs.unlinkFiles([procFile]);
				return {exitCode: killProc.code, proc: killProc};
			}
		}catch(ex){
			console.log("Failed kill because", ex, "\n\tIf process does not exist, do 'rm proc.json' to remove the old pid information.");
		}
	}

	// TODO: later we might want ot use the Jetty way to stop server
	// start with stop port: java -jar start.jar STOP.PORT=28282 STOP.KEY=secret
	// stop using the stop port: java -jar start.jar STOP.PORT=28282 STOP.KEY=secret --stop
}



// --------- Public API: Server DB Management --------- //
// Note: for now, assume localhost:5432 and appname_db & appname_user/welcome
async function initDb(serverDir, opts){
	// if we do not have serverDir, 
	if (typeof serverDir !== "string"){
		serverDir = "./";
		opts = serverDir;
	}

	var config = await fs.readJson(opsVals.appConfigFile(serverDir));
		
	var appName = config.appName;

	// get the sqlDir
	var sqlDir = opsVals.sqlDir(serverDir, config);
		
	// copy the createDb source file to modify the database and user name 
	var createDbSrcFile = (await fs.listFiles(sqlDir, {to: 0}))[0];
	console.log(".....", sqlDir, createDbSrcFile);
	var createDbFile = path.join(serverDir,"00_create-db.sql");
	await fs.copy(createDbSrcFile,createDbFile);

	var dbName = appName + "_db";
	var dbUser = appName + "_user";

	// replace the db name and username
	console.log(`Creating the 00_create-db.sql file with the db name ${dbName} and db user ${dbUser}`);
	var replaceDbCred = [{rgx: /\w*_db/ig, val: dbName},{rgx: /\w*_user/ig, val: dbUser}];
	await utils.replaceInFiles(createDbFile, replaceDbCred);

	await pg.psqlImport({user: "postgres", db: "postgres"}, createDbFile);
	await pg.psqlImport({user: dbUser, db: dbName}, await fs.listFiles(sqlDir, {from: 1}));
	await pg.psqlImport({user: dbUser, db: dbName}, await fs.listFiles(sqlDir, {prefix: "drop_", suffix: ".sql"}));
}

// --------- /Public API: Server DB Management --------- //

// --------- Public API: Others --------- //
async function makePostReceive(serverDir){
	// if we do not have serverDir, 
	if (typeof serverDir !== "string"){
		serverDir = "./";
	}

	var config = await fs.readJson(opsVals.appConfigFile(serverDir));

	// make it absolute
	serverDir = path.resolve(serverDir);

	var content = '#!/bin/bash\n' +
								'echo "---------from bash post receive"\n' +
								'source /home/ec2-user/.bash_profile\n' +
								'cd ' + serverDir + '\n' +
								'node manager fullUpdate\n';

	var warOrigin = config.warOrigin;

	// check if the directory exist
	if (!fs.pathExists(warOrigin)){
		throw "App git repo dir " + warOrigin + " is not setup or not local. War git is local, setup first with 'node manager makeWarRepo APPNAME'";
	}


	var postReceiveFile = path.join(warOrigin, "/hooks/post-receive");
	console.log(">>> writting " + postReceiveFile);
	await fs.writeFile(postReceiveFile, content, 'utf8');	
	await fs.chmodSync(postReceiveFile,'770');
}

async function updateWar(serverDir){
	// if we do not have serverDir, 
	if (typeof serverDir !== "string"){
		serverDir = "./";
	}

	var config = await fs.readJson(opsVals.appConfigFile(serverDir));

	var webappDir = opsVals.webappDir(serverDir, config);
	webappDir = path.resolve(webappDir);

	// NOTE: adde the GIT_DIR to make sure that when called from post-receive we do not get the ". not a git directory"
	await spawn("git",["pull"],{cwd: webappDir, env: {GIT_DIR: webappDir + "/.git"}});
} 
// --------- /Public API: Others --------- //

// --------- private --------- //
function get_JETTY_HOME(){
	if (!process.env.JETTY_HOME){
		throw "JETTY_HOME environment variable not found";
	}
	return process.env.JETTY_HOME;
}
// --------- /private --------- //