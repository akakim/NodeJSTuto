
var http  = require('http');
var fs    = require('fs');
var url   = require('url');

var app = http.createServer( function(request,response){

    var _url = request.url;
    var queryData = url.parse(_url,true).query;
    var title = queryData.id;


    console.log( request.url );
    // if( _url == '/'){
    //     title = 'welcome';
    // }
    //
    // if (_url == '/favicon.ico'){
    //
    //     return response.writeHead(4040);
    //
    // }
    //
    // response.writeHead(200);
    //
    // var template = `
    // <!doctype html>
    // <html>
    //    <head>
    //       <title> web1 - ${title}</title>
    //       <meta charset="utf-8">
    //    </head>
    //
    //    <body>
    //
    //       <h1> <a href="/">web</a></h1>
    //
    //       <ul>
    //
    //             <li><a href="/?id=HTML">HTML</a></li>
    //             <li><a href="/?id=CSS">CSS</a></li>
    //             <li><a href="/?id=javascript"/>JavaScript</li>
    //
    //           <h2>${title}</h2>
    //           <p>
    //           <a href="https://www.w3.org/TR/html5/" target="_blank" title="html5 specification">Hypertext Markup Language (HTML)</a>
    //            is the standard markup language for <strong>creating <u>web</u> pages</strong>
    //            and web applications.Web browsers receive HTML documents from a web server or from local storage and render them into multimedia web pages. HTML describes the structure of a web page semantically and originally included cues for the appearance of the document.
    //           </p>
    //
    //           <p style="margin-top:45px;">HTML elements are the building blocks of HTML pages. With HTML constructs, images and other objects, such as interactive forms, may be embedded into the rendered page. It provides a means to create structured documents by denoting structural semantics for text such as headings, paragraphs, lists, links, quotes and other items. HTML elements are delineated by tags, written using angle brackets.
    //           </p>
    //           <!-- <img src="coding.jpg" width ="100%"/> -->
    //
    //       </ul>
    //
    //     </body>
    //  </html>
    // `;
    // response.end(template);
});

app.listen(3000);