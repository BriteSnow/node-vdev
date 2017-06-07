#!/usr/bin/env node
const vdev = require("./index.js");
const router = require("cmdrouter");

// execute the commands defined in bin-cmds
router(vdev.cmds).route();
