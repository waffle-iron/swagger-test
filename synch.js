var fs = require('fs');
// var config = require('konfig')()
var obj = JSON.parse(fs.readFileSync('swagger.json', 'utf8'));

var request = require("request");

var url = 'http://localhost:8080/api-docs';

var path = require('path');
var xmldoc = require('xmldoc');


function existsSync(filename) {
    try {
        fs.accessSync(filename);
        return true;
    } catch (ex) {
        return false;
    }
}


var mkdirSync = function (path) {
    //console.log(path);
    try {
        fs.mkdirSync(path);
    } catch (e) {
        //Do nothing
    }
}

function newFileContent(endPoint, operation, response, verb) {
    var reason = obj.paths[operation][verb].responses[response].description;
    var operationNoSlash = operation.substring(1, operation.length);
    var describeSkeleton = 'describe(\'' + response + ' ' + verb.toUpperCase() + ' /' + endPoint + '/' + operationNoSlash + '\', function () {';
    var itSkeleton = '\n\tit(\'<reason>\');'
    var closingBrace = '\n});';
    var describe = '';
    var it = '';
    var content = describeSkeleton;
    var reasons = '';
    //console.log(reason);
    var reasonsContent = new xmldoc.XmlDocument('<root>' + reason + '</root>');
    if (reason.indexOf('<h1>') === 0) {
        var hasBeenPreviousDescribe = false;
        reasonsContent.eachChild(function (child) {
            if (child.name === 'h1') {
                if (hasBeenPreviousDescribe) {
                    reasons += closingBrace;
                }
                reasons += '\ndescribe(\'' + child.val + '\', function () {';
                hasBeenPreviousDescribe = true;
            }
            if (child.name === 'p') {
                reasons += itSkeleton.replace('<reason>', child.val) + '\n';
            }
        });
        reasons += closingBrace;
    } else {
        reasonsContent.eachChild(function (child) {
            reasons += itSkeleton.replace('<reason>', child.val) + '\n';
        });
    }
    content += reasons + closingBrace;
    return {
        reason: reason,
        describeSkeleton: describeSkeleton,
        itSkeleton: itSkeleton,
        closingBrace: closingBrace,
        describe: describe,
        content: content,
        reasons: reasons,
        reasonsContent: reasonsContent,
        hasBeenPreviousDescribe: hasBeenPreviousDescribe
    };
}

function updatedFileContent(fileContents, operation, response, verb) {
    var reason = obj.paths[operation][verb].responses[response].description;
    //console.log(reason);
    var itSkeleton = '\n\tit(\'<reason>\');'
    var closingBrace = '\n});';
    var describe = '';
    var reasons = '';
    var reasonsContent = new xmldoc.XmlDocument('<root>' + reason + '</root>');
    if (reason.indexOf('<h1>') === 0) {
        var hasBeenPreviousDescribe = false;
        reasonsContent.eachChild(function (child) {
            if (child.name === 'h1') {
                if (hasBeenPreviousDescribe) {
                    reasons += closingBrace;
                }
                reasons += '\ndescribe(\'' + child.val + '\', function () {';
                hasBeenPreviousDescribe = true;
            }
            if (child.name === 'p') {

                if (fileContents.indexOf(child.val) === 0) {
                    fileContents = fileContents.indexOf(child.val);
                }
                //reasons += itSkeleton.replace('<reason>', child.val) + '\n';
            }
        });
        reasons += closingBrace;
    } else {
        reasonsContent.eachChild(function (child) {
            if (fileContents.indexOf(child.val) === -1) {
                fileContents = fileContents.substring(0, fileContents.length - 4);

                fileContents += itSkeleton.replace('<reason>', child.val) + '\n});';
            }
        });
    }
    //content += reasons + closingBrace;
    return {
        content: fileContents,
    };
}

// request({
//     url: url,
//     json: true
// }, function (error, res, body) {
//
// //console.log(error, res.statusCode);
//
//     if (!error && res.statusCode === 200) {
//         obj = res.toJSON().body;
console.log(obj);
for (var operation in obj.paths) {
    for (var verb in obj.paths[operation]) {
        var endPoint = obj.paths[operation][verb].tags[0];
        for (var response in obj.paths[operation][verb].responses) {
            if (endPoint != 'healthcheck') {
                //console.log(endPoint, operation, verb, response, reason);
                var operationNoSlash = operation.substring(1, operation.length);
                mkdirSync(path.join('test', '_' + endPoint));
                mkdirSync(path.join('test', '_' + endPoint, operationNoSlash.replace(/\//g, '.')));
                mkdirSync(path.join('test', '_' + endPoint, operationNoSlash.replace(/\//g, '.'), verb.toUpperCase()));
                var testFileName = path.join('test', '_' + endPoint, operationNoSlash.replace(/\//g, '.'), verb.toUpperCase()) + '/' + response.toUpperCase() + '.js';
                if (existsSync(testFileName)) {
                    var fileContents = fs.readFileSync(testFileName).toString();
                    fs.writeFileSync(testFileName, updatedFileContent(fileContents, operation, response, verb).content);

                } else {
                    fs.writeFileSync(testFileName, newFileContent(endPoint, operation, response, verb).content);
                }
            }
        }
    }
    //     }
    // }
}