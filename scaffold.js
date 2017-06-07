var path = require("path");
var spawn = require("p-spawn");
var fs = require("fs-extra-plus");
var git = require("./git.js");

module.exports = {
	create
};


var defaultOpts = {
	src: "https://github.com/BriteSnow/projectmvc.git",
	// for dev
	//src: "/Users/jeremychone/_jeremy/_projects/projectmvc/projectmvc_mvnsrc",
	dir: "./"
};

/**
 - opts
		- src: default "https://github.com/BriteSnow/projectmvc.git"
		- dir: default "./"
		- package: e.g, "io.testapp"
		- appName: e.g, "testApplication"
*/
async function create(opts){

	opts = Object.assign({}, defaultOpts, opts);

	var packageNames = opts.package.split(".");

	// close projectmvc
	await git.clone(opts.dir, opts.src);

	// if we have a opts.srcBranch we checkout this one
	if (opts.srcBranch){
		await spawn("git", ["checkout", opts.srcBranch],  {cwd: opts.dir});
	}

	// remove the .git (should not be in git anymore, since it is a different app)
	await fs.remove(path.join(opts.dir,".git/"));


	// rename the src/.../java folders src/.../TMP-JAVA (to make sure we can create a fresh new structure)
	await fs.rename(path.join(opts.dir,"/src/main/java"), path.join(opts.dir,"/src/main/TMP-JAVA"));
	await fs.rename(path.join(opts.dir,"/src/test/java"), path.join(opts.dir,"/src/test/TMP-JAVA"));

	var packagePath = packageNames.join("/");
	var baseMainJavaDir = path.join(opts.dir,"/src/main/java",packagePath);
	var baseTestJavaDir = path.join(opts.dir,"/src/test/java",packagePath);

	// --------- copy base java files --------- //
	// create the new main java package folder with the org/projectmvc main java files	
	await fs.mkdirs(baseMainJavaDir);
	await fs.copy(path.join(opts.dir,"/src/main/TMP-JAVA/org/projectmvc"), baseMainJavaDir);
	await fs.remove(path.join(opts.dir,"/src/main/TMP-JAVA")); // not needed anymore

	// create the new test java package folder with the org/projectmvc test java files	
	await fs.mkdirs(baseTestJavaDir);
	await fs.copy(path.join(opts.dir,"/src/test/TMP-JAVA/org/projectmvc"), baseTestJavaDir);
	await fs.remove(path.join(opts.dir,"/src/test/TMP-JAVA")); // not needed anymore
	// --------- /copy base java files --------- //

	// --------- replace package --------- //
	var replacePackage = {rgx: /org\.projectmvc/ig, val: opts.package};
	// all main .java files
	var packageFiles = await fs.listFiles(baseMainJavaDir, ".java");
	// plus all test .java files
	packageFiles = packageFiles.concat(await fs.listFiles(baseTestJavaDir, ".java"));
	// plus snow.properties
	packageFiles.push(path.join(opts.dir,"/src/main/webapp/WEB-INF/snow.properties"));		
	// plus pom.xml
	packageFiles.push(path.join(opts.dir,"pom.xml"));	

	replaceInFiles(packageFiles, replacePackage);
	// --------- /replace package --------- //

	// --------- replace appName --------- //
	var replaceAppName = {rgx: /projectmvc/ig, val: opts.appName};


	var appNameFiles = ["pom.xml",
		// config files
		"/src/main/webapp/WEB-INF/sql/00_create-db.sql",
		"/src/main/webapp/WEB-INF/snow.properties", 
		// web files
		"/src/main/webapp/_frame.ftl",
		"/src/main/webapp/loginpage.ftl",
		// nodejs files
		"package.json"].map(n => path.join(opts.dir, n));

	replaceInFiles(appNameFiles, replaceAppName);
	// --------- /replace appName --------- //

}


// --------- Private Utilities --------- //

async function replaceInFiles(files, replaceCmds){
	files  = makeArray(files);	
	replaceCmds = makeArray(replaceCmds);

		
	for (let i = 0; i < files.length; i++){
		let file = files[i];
		let content = await fs.readFileSync(file, 'utf8');
		for (let j = 0; j < replaceCmds.length; j++){
			let replaceCmd = replaceCmds[j];
			content = content.replace(replaceCmd.rgx,replaceCmd.val);	
		}		
		await fs.writeFile(file, content, 'utf8');		
	}		
}


// if val is not an Array, it does make an array with val as the only element
function makeArray(val){
	return Array.isArray(val)?val:[val];
}

// --------- /Private Utilities --------- //

