import * as fs from 'fs-extra-plus';
import { spawn } from 'p-spawn';


export type PsqlOptions = {
	user?: string,
	pwd?: string,
	db?: string,
	host?: string,
	port?: string
}


// --------- psql --------- //
// NOTE: for now, ignore pgOpts.pwd
export async function psqlImport(pgOpts: PsqlOptions, filePaths: string[]) {
	if (typeof filePaths === "string") {
		filePaths = [filePaths];
	}
	var baseArgs = pgArgs(pgOpts);

	var cmd = "psql";
	// TODO: add the password env var.
	for (var i = 0; i < filePaths.length; i++) {
		let filePath = filePaths[i];
		let args = baseArgs.slice(0);
		args.push("-f", filePath);

		console.log("will execute >> " + cmd + " " + args.join(" "));
		await spawn(cmd, args);
	}
}

// pgdump with no-owner, no-acl
export async function psqlExport(pgOpts: PsqlOptions, filepath: string) {
	var defaultArgs = ["--no-owner", "--no-acl"];
	var baseArgs = pgArgs(pgOpts);

	var args = [];
	var cmd = "pg_dump";
	args = defaultArgs.concat(baseArgs);

	var fStream = fs.createWriteStream(filepath, { flags: 'w' });
	console.log("will execute >> " + cmd + " " + args.join(" ") + "\n\t into " + filepath);

	var env = Object.assign({}, process.env);
	env.PGPASSWORD = pgOpts.pwd;

	await spawn(cmd, args, {
		env,
		onStdout: (data) => {
			fStream.write(data);
		}
	});

}


// private: Build a cmd line argument list from a pgOpts {user, db[, pwd][, host][, port: 5432]} and make it an command line arguments
function pgArgs(pgOpts: PsqlOptions) {
	var cmdArgs = [];

	if (pgOpts.user) {
		cmdArgs.push("-U", pgOpts.user);
	}
	if (pgOpts.db) {
		cmdArgs.push("-d", pgOpts.db);
	}
	if (pgOpts.host) {
		cmdArgs.push("-h", pgOpts.host);
	}
	if (pgOpts.port) {
		cmdArgs.push("-p", pgOpts.port);
	}

	return cmdArgs;
}
// --------- /psql --------- //