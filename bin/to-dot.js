#!/usr/bin/env node
var dot = require("../lib/ontology-dot");

var options = {stream: process.stdout};
if(!!~process.argv.indexOf("--children")){
    options.children = true;
}
dot.fromStream(process.stdin, options);