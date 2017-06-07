var fs = require("fs-extra-plus");
var strip = require("strip-json-comments");

module.exports = {
	ensureArray, replaceInFiles, readJson
};


// --------- File Utils --------- //
// readJon but also support comments
async function readJson(file){
	var content = await fs.readFile(file,"utf-8");
	content = strip(content);
	return JSON.parse(content);
}


async function replaceInFiles(files, replaceCmds){
	files  = ensureArray(files);	
	replaceCmds = ensureArray(replaceCmds);
		
	for (let i = 0; i < files.length; i++){
		let file = files[i];
		let content = await fs.readFile(file, 'utf8');
		for (let j = 0; j < replaceCmds.length; j++){
			let replaceCmd = replaceCmds[j];
			content = content.replace(replaceCmd.rgx,replaceCmd.val);	
		}		
		await fs.writeFile(file, content, 'utf8');		
	}		
}
// --------- /File Utils --------- //


// --------- Lang Utils --------- //
// if val is not an Array, it does make an array with val as the only element
function ensureArray(val){
	return Array.isArray(val)?val:[val];
}
// --------- /Lang Utils --------- //