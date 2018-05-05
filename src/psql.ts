import * as fs from 'fs-extra-plus';
import { spawn, Options as SpawnOptions } from 'p-spawn';


export type PsqlOptions = {
	user?: string,
	pwd?: string,
	db?: string,
	host?: string,
	port?: string,
	toConsole?: boolean;
}

const defaultPsqlOptions = {
	toConsole: true
}

// --------- psql public API --------- //
export type PsqlImportItem = { file: string, stdout?: string, stderr?: string };

// NOTE: for now, ignore pgOpts.pwd
export async function psqlImport(pgOpts: PsqlOptions, filePaths: string[]): Promise<PsqlImportItem[]> {
	pgOpts = { ...defaultPsqlOptions, ...pgOpts };
	const items: PsqlImportItem[] = [];
	if (typeof filePaths === "string") {
		filePaths = [filePaths];
	}
	var baseArgs = buildPgArgs(pgOpts);

	var cmd = "psql";

	// TODO: add the password env var.
	for (let file of filePaths) {
		let args = baseArgs.slice(0);
		args.push("-f", file);

		if (pgOpts.toConsole) {
			console.log("will execute >> " + cmd + " " + args.join(" "));
		}
		const spawnOptions = buildSpawnOptions(pgOpts);
		const p = await spawn(cmd, args, spawnOptions);
		const item: PsqlImportItem = { file };
		item.stdout = p.stdout;
		if (p.stderr) {
			item.stderr = p.stderr.trim();
		}
		items.push(item);
		if (item.stderr) {
			const err: Error & { items?: PsqlImportItem[] } = new Error(`psqlImport ERROR for file ${file}:\n${item.stderr}`);
			err.items = items;
			throw err;
		}
	}

	return items;

}

// pgdump with no-owner, no-acl
export async function psqlExport(pgOpts: PsqlOptions, filepath: string) {
	var defaultArgs = ["--no-owner", "--no-acl"];
	var baseArgs = buildPgArgs(pgOpts);

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
// --------- /psql public API --------- //

// --------- Utils public API --------- //
export type PgTestResult = { success: boolean, message?: string, err?: string };

export async function pgTest(pgOpts: PsqlOptions): Promise<PgTestResult> {
	const status = await pgStatus(pgOpts);

	if (!status.accepting) {
		return { success: false, message: status.message };
	}
	// --command="SELECT version();

	// var args = buildPgArgs(pgOpts);
	var args = buildPgArgs(pgOpts);
	args.push("--command=SELECT version()");
	const p = await spawn('psql', args, { capture: ['stdout', 'stderr'], ignoreFail: true });
	if (p.code === 0) {
		return { success: true, message: p.stdout.trim() };
	} else {
		const r: PgTestResult = { success: false, message: p.stdout };
		if (p.stderr) {
			r.err = p.stderr.trim();
		}
		return r;
	}
}

export type PgStatusResult = { accepting: boolean, message: string, code: number };
/** Return the status of a pg database process (without the database) */
export async function pgStatus(pgOpts: PsqlOptions): Promise<PgStatusResult> {
	var args = buildPgArgs(pgOpts);
	//args.push('-q'); // for the quiet mode, we just need to result code
	const p = await spawn('pg_isready', args, { ignoreFail: true, capture: ['stdout', 'stderr'] });
	const code = p.code;
	const message = p.stdout.trim();
	const accepting = (0 === p.code) ? true : false;
	return { accepting, message, code };
}

// --------- /Utils public API --------- //


// --------- Private Utils --------- //
function buildSpawnOptions(pgOpts: PsqlOptions) {
	let spawnOptions: any = { capture: ['stdout', 'stderr'] };
	if (pgOpts.toConsole) {
		spawnOptions.toConsole = true;
	}
	return spawnOptions;
}
// private: Build a cmd line argument list from a pgOpts {user, db[, pwd][, host][, port: 5432]} and make it an command line arguments
function buildPgArgs(pgOpts: PsqlOptions) {
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
// --------- /Private Utils --------- //
