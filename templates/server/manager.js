const vdev = require("vdev");
const router = require("cmdrouter");


router(Object.assign(vdev.cmds, {customFn})).route();


async function customFn(){
	console.log("A custom function that can be called");
}

