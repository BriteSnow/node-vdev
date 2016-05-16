var path = require("path");
var fs = require("fs-extra");

module.exports = {
	getVarStringValue: getVarStringValue, 
	saveVarStringValue: saveVarStringValue, 
	incDropVersion: incDropVersion
};

// will increment the last number of a string (with '-' seperator convension) and preserving padding
function incDropVersion(version){
	var match = version.match(/-(\d+)$/);
	var v, n;
	if (match){
		v = match[1];
		n = parseInt(v);
		n++;
		return version.substring(0,match.index) + "-" + zeroPad(n,v.length);
	}else{
		return null;
	}	
}

// Will get the string value for the first variable name varName. 
// Note: simple regex matching base on matching varName = ""
function getVarStringValue(filePath, varName){
	filePath = path.resolve(filePath);
	var content = fs.readFileSync(filePath, 'utf8');
	var rx = new RegExp(varName + '\\s*=\\s*"(.*)"', 'i');
	var match = content.match(rx);
	if (match){
		return match[1];
	}else {
		return null;
	}
}

// Will change the file variable string value varName with the new value.
// Note: simple regex matching and replace based on matching varName = ""
function saveVarStringValue(filePath, varName, value){
	filePath = path.resolve(filePath);
	var content = fs.readFileSync(filePath, 'utf8');
	var rx = new RegExp('(.*' + varName + '\\s*=\\s*").*(".*)', 'i');
	content = content.replace(rx,'$1' + value + '$2');
	fs.writeFileSync(filePath, content, 'utf8');
}

// --------- utility functions --------- //
function zeroPad(num, places) {
	var zero = places - num.toString().length + 1;
	return Array(+(zero > 0 && zero)).join("0") + num;
}
// --------- /utility functions --------- //

