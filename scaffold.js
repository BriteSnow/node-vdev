var shell = require("shelljs");
var path = require("path");
var fs = require("fs-extra");
var git = require("./git.js");
var glob = require("glob");

module.exports = {
	init: init
};

var projectmvcOrigin = "https://github.com/BriteSnow/projectmvc.git";

// For development
//var projectmvcOrigin = "/Users/jeremychone/_jeremy/_projects/projectmvc/projectmvc_mvnsrc";


function init(baseDir, basePackage, appName){
	var packageNames = basePackage.split(".");

	// close projectmvc
	git.clone(baseDir, projectmvcOrigin);

	// remove the .git (should not be in git anymore, since it is a different app)
	fs.removeSync(path.join(baseDir,".git/"));

	// rename the src/.../java folders src/.../TMP-JAVA (to make sure we can create a fresh new structure)
	fs.renameSync(path.join(baseDir,"/src/main/java"), path.join(baseDir,"/src/main/TMP-JAVA"));
	fs.renameSync(path.join(baseDir,"/src/test/java"), path.join(baseDir,"/src/test/TMP-JAVA"));

	var packagePath = packageNames.join("/");
	var baseMainJavaDir = path.join(baseDir,"/src/main/java",packagePath);
	var baseTestJavaDir = path.join(baseDir,"/src/test/java",packagePath);

	// --------- copy base java files --------- //
	// create the new main java package folder with the org/projectmvc main java files	
	fs.mkdirsSync(baseMainJavaDir);
	fs.copySync(path.join(baseDir,"/src/main/TMP-JAVA/org/projectmvc"), baseMainJavaDir);
	fs.removeSync(path.join(baseDir,"/src/main/TMP-JAVA")); // not needed anymore

	// create the new test java package folder with the org/projectmvc test java files	
	fs.mkdirsSync(baseTestJavaDir);
	fs.copySync(path.join(baseDir,"/src/test/TMP-JAVA/org/projectmvc"), baseTestJavaDir);
	fs.removeSync(path.join(baseDir,"/src/test/TMP-JAVA")); // not needed anymore	
	// --------- /copy base java files --------- //

	// --------- replace package --------- //
	var replacePackage = {rgx: /org\.projectmvc/ig, val: basePackage};
	// all main .java files
	var packageFiles = glob.sync(path.join(baseMainJavaDir,"**/*.java"));
	// plus all test .java files
	packageFiles = packageFiles.concat(glob.sync(path.join(baseTestJavaDir,"**/*.java")));
	// plus snow.properties
	packageFiles.push(path.join(baseDir,"/src/main/webapp/WEB-INF/snow.properties"));	

	replaceInFiles(packageFiles, replacePackage);
	// --------- /replace package --------- //

	// --------- replace appName --------- //
	var replaceAppName = {rgx: /projectmvc/ig, val: appName};
	var appNameFiles = [path.join(baseDir, "pom.xml"),
											// config files
											path.join(baseDir,"/src/main/webapp/WEB-INF/sql/00_create-db.sql"),
											path.join(baseDir,"/src/main/webapp/WEB-INF/snow.properties"), 
											// web files
											path.join(baseDir,"/src/main/webapp/_frame.ftl"),
											path.join(baseDir,"/src/main/webapp/loginpage.ftl"),
											path.join(baseDir,"/src/main/webapp/tmpl/MainView.tmpl"),
											path.join(baseDir,"/src/main/webapp/sysadmin/tmpl/AdminView.tmpl"),
											// nodejs files
											path.join(baseDir,"gulpfile.js"),
											path.join(baseDir,"package.json")];

	replaceInFiles(appNameFiles, replaceAppName);
	// --------- /replace appName --------- //

}


// --------- Private Utilities --------- //

function replaceInFiles(files, replaceCmds){
	files  = makeArray(files);	
	replaceCmds = makeArray(replaceCmds);

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


// if val is not an Array, it does make an array with val as the only element
function makeArray(val){
	return Array.isArray(val)?val:[val];
}

// --------- /Private Utilities --------- //

