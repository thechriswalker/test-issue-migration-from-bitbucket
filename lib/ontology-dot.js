#!/usr/bin/env node
/*
    Read in Onotology YAML, produce dot format for graphviz
*/
var yaml = require("js-yaml");

var depurl = function(s){
    return s.replace("http://www.purl.org/", "");
};

var getNS = function(id){
    return depurl(id).split("/")[0];
};

var DIR_FROM = true, DIR_TO = false;

function createDotFromYAMLString(yamlString, options){
    var o = yaml.load(yamlString, {
        onWarning: function(w){
            console.warn(w.message);
        }
    });
    return createDot(o, options);
}

function createDotFromYAMLStream(yamlStream, options, cb){
    var b = "", callback = (typeof cb === "function") ? cb : function(){};
    yamlStream.setEncoding("utf8");
    yamlStream.on("data", function(d){ b+=d;});
    yamlStream.on("end", function(){
        callback(createDotFromYAMLString(b, options));
    });
    //ensure data is flowing
    yamlStream.resume();
}

function createDot(ontology, options){
    var opts = options || {};
    var DO_CHILD_RELATIONSHIPS = !!opts.children;
    var namespaces = {
    /*
        idea here is we create sections for each namespace ("arago/", "ogit/", "tabtab/")
        nd bulk up operations, so we can define defaults for coloring etc base on group.
        so this obj's keys will be namespaces, each namespace an array, on namespace creation
        we will push the color info into it.
    */
    },
    idMap = {},
    childMap = {}, //this is a map from an Entity to it's children.
    prefix = -1,
    next = 0,
    //for color info see: http://www.graphviz.org/doc/info/colors.html#brewer
    colorIdx = 1,
    colorMax = 10,
    colorScheme = "paired10",
    keys = "abcdefghijklmnopqrstuvwxyz".split("");

    function getId(str){
        str = depurl(str);
        if(!(str in idMap)){
            var id = "";
            if(prefix >= 0){
                id += keys[prefix];
            }
            id += keys[next++];
            if(next === keys.length){
                prefix++;
                next = 0;
            }
            idMap[str] = id;
        }
        return idMap[str];
    }

    function handleEntity(data){
        var pid, nid = getId(data.id);
        if(data.parent){
            pid = getId(data.parent);
            if(!(pid in childMap)){
                childMap[pid] = [];
            }
            childMap[pid].push(data.id);
        }
        addVertexData(getNS(data.id), nid+" [label=\""+depurl(data.id)+"\"];");
    }

    function handleVerb(data){
        if(!data.allowed){ return; }
        data.allowed.forEach(function(obj){
            //get the namespace from the Verb itself
            addEdgeData(getNS(data.id), getId(obj.from)+" -> "+getId(obj.to)+" [label=\""+depurl(data.id)+"\"];");
            //now look at children.
            if(DO_CHILD_RELATIONSHIPS){
                doChildren(data, obj.from, DIR_FROM, obj.to);
                doChildren(data, obj.to, DIR_TO, obj.from);
            }
        });
    }


    function doChildren(edge, node, dir, target){
        var nid = getId(node),
            ns = getNS(edge.id),
            tid = getId(target),
            label = depurl(edge.id);
        if(nid in childMap){
            //has children
            childMap[nid].forEach(function(parent){
                var from,to;
                if(dir === DIR_FROM){
                    from = getId(parent);
                    to = getId(target);
                }else{
                    to = getId(parent);
                    from = getId(target);
                }
                edgeLine(ns, from, to, label);
                //and recurse?
                doChildren(edge, parent, dir, target);
            });
        }
    }

    function edgeLine(ns, from, to, label){
        addEdgeData(ns, from+" -> "+to+" [label=\""+label+"\"];");
    }

    function addVertexData(ns, line){
        if(!(ns in namespaces)){
            createNamespace(ns);
        }
        namespaces[ns].vertices.push(line);
    }

    function addEdgeData(ns, line){
        if(!(ns in namespaces)){
            createNamespace(ns);
        }
        namespaces[ns].edges.push(line);
    }

    function createNamespace(ns){
        var bg = ""+(colorIdx++),
            color = ""+(colorIdx++);

        namespaces[ns] = {
            preamble: [
                "// Namespace: "+ns,
                "edge [penwidth=2, colorscheme="+colorScheme+", color="+color+", fontcolor="+color+"];",
                "node [penwidth=2, colorscheme="+colorScheme+", color="+color+", fontcolor="+color+", fillcolor="+bg+", style=filled ];",
                ""
            ],
            vertices: [],
            edges: []
        };
        if(colorIdx > colorMax){
            console.warn("not enough colors!");
        }
    }

    //loop twice, first for all entities
    ontology.map(function(data){
        if("Entity" in data){
            handleEntity(data.Entity);
        }
        return data;
    }).forEach(function(data){ //then for all edges.
        if("Verb" in data){
            handleVerb(data.Verb);
        }
    });

    var write, buffer, returner;
    if("write" in opts.stream && typeof opts.stream.write === "function"){
        write = function(data){
            opts.stream.write(data, "utf8");
        };
        returner = function(){
            return null;
        };
    }else{
        buffer = "";
        write = function(data){
            buffer += data;
        };
        returner = function(){
            return buffer;
        };
    }

    write("digraph Ontology {\n");
    Object.keys(namespaces).map(function(ns){
        write("  "+namespaces[ns].preamble.join("\n  ")+"\n");
        write("  "+namespaces[ns].vertices.join("\n  ")+"\n");
        return ns;
    }).forEach(function(ns){
        write("  "+namespaces[ns].preamble.join("\n  ")+"\n");
        write("  "+namespaces[ns].edges.join("\n  ")+"\n");
    });
    write("}\n");
}

//exports
exports.fromString = createDotFromYAMLString;
exports.fromStream = createDotFromYAMLStream;
exports.fromObject = createDot;