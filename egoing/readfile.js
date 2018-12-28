/**
 * Create Read Update Delete
 */

//var http = require ('http');

var fs = require('fs');
fs.readFile('sample.txt','utf8',function(error,data){

    console.log(data);
});