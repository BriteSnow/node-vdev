var shell = require("shelljs");
var path = require("path");
var fs = require("fs-extra");
var git = require("./git.js");

module.exports = {
	setup: setup,
	start: start,
	downloadWebapp: downloadWebapp
};

/**
 * Create a jettybase base directory with the convention
 * jettybase/start.ini (port 8080)
 * jettybase/webapps/app_war.xml (which will point to the jettybase/webapps/app_war/ application)
 **/
function setup(serverDir){
	serverDir = getServerDir(serverDir);

	// mkdir jettybaseDir if needed
	console.log("will mkdir >> ", serverDir);
	fs.mkdirsSync(serverDir);

	// copy the jettybase template files/structure
	var srcDir = path.join(__dirname,"templates/server");
	var destDir = serverDir;
	console.log("will copy >>\n\tfrom: ", srcDir, "\n\tto:   ", destDir);
	fs.copySync(srcDir, destDir);
}

function start(serverDir,async){
	return new Promise(function(resolve, reject){
		var pwd = shell.pwd();
		serverDir = getServerDir(serverDir);

		var jettybaseDir = getJettybaseDir(serverDir);

		shell.cd(jettybaseDir);	
		var cmd = ["java", "-jar", get_JETTY_HOME() + "/start.jar"].join(" ");
		console.log("will exec >> ", cmd);

		var callback;
		if (async){
			callback = function(code, output){
				resolve({code:code, output:output});
			};
		}
		var result = shell.exec(cmd, callback);

		shell.cd(pwd);

		if (!async){
			resolve(result);
		}		
	});
}

function downloadWebapp(serverDir, gitOrigin){
	var pwd = shell.pwd();	
	serverDir = getServerDir(serverDir);
	jettybaseDir = getJettybaseDir(serverDir);

	// cd to the right folder
	var webappsDir = path.join(jettybaseDir, "webapps");

	git.gitClone(webappsDir, gitOrigin, "webapp");
}

// function startJettyAsync(serverDir){
// 	_startJetty(serverDir,true);
// }

// function startJetty(serverDir){
// 	_startJetty(serverDir,false);
// }

// --------- utility functions --------- //
function getServerDir(serverDir){
	serverDir = serverDir || "./"; // by default current folder is the root
	serverDir = path.resolve(serverDir); // make serverDir absolute
	return serverDir;
}

function getJettybaseDir(serverDir){
	return path.join(getServerDir(serverDir),"/jettybase");
}

// Return the JETTY_HOME environment or throw an except if it does not exist. 
function get_JETTY_HOME(){
	if (!process.env.JETTY_HOME){
		throw "JETTY_HOME environment variable not found";
	}
	return process.env.JETTY_HOME;
}
// --------- /utility functions --------- //
