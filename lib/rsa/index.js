var fs = require('fs');

// Read and eval library
var window = {},
    navigator = {};

let filedata = fs.readFileSync(__dirname+'/jsbn.js','utf8');
eval(filedata);
filedata = fs.readFileSync(__dirname+'/prng4.js','utf8');
eval(filedata);
filedata = fs.readFileSync(__dirname+'/rng.js','utf8');
eval(filedata);
filedata = fs.readFileSync(__dirname+'/rsa.js','utf8');
eval(filedata);

/* The quadtree.js file defines a class 'QuadTree' which is all we want to export */

exports.newRSAKey = function() {
    return new RSAKey();
}
