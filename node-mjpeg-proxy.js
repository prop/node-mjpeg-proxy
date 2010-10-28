/**************************
TODO:
1. Make it work with existing HTTP servers and listen to resource URLs
**************************/

var http = require('http'),
sys = require('sys'),
url = require('url'),
express = require('express');

Proxy = exports.Proxy = function (srcURL, options) {
  if (!srcURL) {
    throw new Error("Please provide a source feed URL");
  }
  srcURL = url.parse(srcURL);

  var srcClient = http.createClient(srcURL.port || 80, srcURL.hostname);

  var audienceServer = options.server || null;
  var audienceServerPort = options.port || 5080;
  var audienceServerResource = options.resource || null;
  var audienceClients = [];

  // Starting the stream on from the source
  var request = srcClient.request('GET', srcURL.pathname +
  (srcURL.search ? srcURL.search : ""),
  {'host': srcURL.hostname});
  request.end();
  request.on('response', function (srcResponse) {
    /** Setup Audience server listener **/
    if (!audienceServer) {
      audienceServer = express.createServer();
      audienceServer.listen(audienceServerPort);
      // sys.puts('node-mjpeg-proxy server started on port ' + audienceServerPort);
    }
    audienceServer.get('/' + (audienceServerResource || ""), function (req, res) {
      var path = url.parse(req.url).pathname;
      if (audienceServerResource && path &&
          path.indexOf('/' + audienceServerResource) === 0) {
        /**
         * Replicate the header from the source
         **/
        res.writeHead(200, srcResponse.headers);
        /**
         * Push the client into the client list
         **/
        audienceClients.push(res);
        /**
         * Clean up connections when they're dead
         **/
        res.socket.on('close', function () {
          audienceClients.splice(audienceClients.indexOf(res), 1);
        });
      }
    });

    /** Send data to relevant clients **/
    srcResponse.setEncoding('binary');
    srcResponse.on('data', function (chunk) {
      var i;
      for (i = audienceClients.length; i--;) {
        audienceClients[i].write(chunk, 'binary');
      }
    });
  });
};
