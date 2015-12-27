var path = require("path");
var through = require("through2");
var StringDecoder = require('string_decoder').StringDecoder;
var fs = require("fs-extra");
var extend = require("extend");
var shell = require("shelljs");

module.exports = {
	psql: psql,
	psqlImport: psqlImport,
	psqlExport: psqlExport,

	listSqlFiles: listSqlFiles,
	listNumberedFiles: listNumberedFiles
};


// --------- psql --------- //


function psql(user, pwd, db, filePaths){
	console.log("vdev.psql DEPRECATED. use vdev.pgExec(pgOpts,filePaths)");

	if (typeof filePaths === "string"){
		filePaths = [filePaths];
	}
	var filePath;
	for (var i = 0; i < filePaths.length; i++){
		filePath = filePaths[i];
		var cmd = ["psql","-U",user,"-d",db,"-f", filePath].join(" ");
		console.log("will execute >> " + cmd);
		shell.exec(cmd);
	}
	//console.log("DONE execute >> ", ex);
}

// NOTE: for now, ignore pgOpts.pwd
function psqlImport(pgOpts, filePaths){
	if (typeof filePaths === "string"){
		filePaths = [filePaths];
	}
	var baseArgs = pgArgs(pgOpts);
	
	// TODO: add the password env var.

	var filePath, args;
	for (var i = 0; i < filePaths.length; i++){
		filePath = filePaths[i];
		args = ["psql"].concat(baseArgs);
		args.push("-f",filePath);
		var cmd = args.join(" ");
		console.log("will execute >> " + cmd);
		shell.exec(cmd);
	}	
}

// pgdump with no-owner, no-acl
function psqlExport(pgOpts, filepath){
	var defaultArgs = ["--no-owner","--no-acl"];
	var baseArgs = pgArgs(pgOpts);

	var args = [];

	args = ["pg_dump"].concat(defaultArgs).concat(baseArgs);
	args.push(">",filepath);

	setPgPwd(args, pgOpts);
	var cmd = args.join(" ");
	console.log("will execute >> " + cmd);
	shell.exec(cmd);
}

// private: Set the password (for now, add the "PGPASSWORD" env variable)
function setPgPwd(args, pgOpts){
	// FIXME: this will not work on windows.
	if (pgOpts.pwd){
		args.unshift('PGPASSWORD="' + pgOpts.pwd + '"');
	}
}

// private: Build a cmd line argument list from a pgOpts {user, db[, pwd][, host][, port: 5432]} and make it an command line arguments
function pgArgs(pgOpts){
	var cmdArgs = [];

	if (pgOpts.user){
		cmdArgs.push("-U", pgOpts.user);
	}
	if (pgOpts.db){
		cmdArgs.push("-d", pgOpts.db);
	}
	if (pgOpts.host){
		cmdArgs.push("-h", pgOpts.host);	
	}
	if (pgOpts.port){
		cmdArgs.push("-p", pgOpts.port);	
	}

	return cmdArgs;
}
// --------- /psql --------- //

// --------- listSqlFiles --------- //

function listSqlFiles(basePath, options){
	var opts = extend({},{ext:".sql"},options);
	return listNumberedFiles(basePath, opts);
}

// --------- /listSqlFiles --------- //

// --------- Utils --------- //
var listNumberedFilesDefaultOptions = {
	from: 0,
	numRegExp: /^(\d+)/ // regex that will be used to extract the number
};

/**
 * Return a list of path for all matching files from this base given the option.
 *
 * - basePath: the base path. For now, cannot be null
 *
 * - options: 
 *    {from:number, // from this number (inclusive)
 *     to:number, // to this number (inclusive)
 *     ext:string, // file extension to match (default: none)
 *     match:regexString|function, // additional filtering (default: none) NOTE: NOT supported yet
 *     numRegExp  // regex used to extract the number from the path (default: /^(\d+)/)
 *    } 
 **/ 
function listNumberedFiles(basePath, options){
	var names = fs.readdirSync(basePath);

	var opts = extend({},listNumberedFilesDefaultOptions,options);

	names = names.filter(function(name){

		if (opts.ext && !endsWith(name,opts.ext)){
			return false;
		}

		// match if it starts with a number
		var match = opts.numRegExp.exec(name);		

		var num;
		// first check that we start with a number
		if (match && match[1]){
			num = parseInt(match[1],10);

			// we always have a opts.from (default to 0), so, we can compare with num
			if (num >= opts.from){
				// if the opts.to is not a number, or if a number is greater/equal than num, then, it passes.
				if (typeof opts.to === "number" && num <= opts.to || typeof opts.to !== "number"){
					return true;
				}
			}
		}

		return false;

		//var regx = new RegExp("^(\d*)");
		//match = regx.exec(name);
	});

	// make sure it is sorted
	names = names.sort();

	var paths = names.map(function(name){ return path.join(basePath, name);});
	return paths;
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
// --------- /Utils --------- //