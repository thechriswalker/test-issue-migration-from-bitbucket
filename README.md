ontology2dot - create dot graphs from YAML ontology documents
=============================================================

installation: `npm install -g ontology2dot`

usage: `ontology2dot < ontology.yaml > output.dot`

or to add inherited edges: `ontology2dot --children < ontology.yaml > output.dot`

as a module:

    var o2d = require("ontology2dot");

    //read yaml from stream, work out inherited, result as string in callback.
    o2d.fromStream(process.stdin, {children: true}, function(result){
        console.warn("finished!");
        console.log(result);
    });

    //from a yaml string.
    var dot = o2d.fromString(yamlString);

    //from decoded yaml object
    o2d.fromObject(ontologyObject, {stream: process})

works well with Graphviz, e.g.

    ontology2dot --children < ontology.yaml | dot -Tsvg > ontology.svg

