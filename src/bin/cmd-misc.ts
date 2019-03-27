import { cleanNodeFiles, updateVersions } from '../main';
import { CmdMap } from '../utils';


export const cmds: CmdMap = {
	version, nclean
}

async function version() {
	await updateVersions();
}

async function nclean() {
	await cleanNodeFiles();
}
