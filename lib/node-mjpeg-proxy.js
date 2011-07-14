/**************************
TODO:
1. Make it work with existing HTTP servers and listen to resource URLs
2. Refactoring
**************************/

var http = require('http'),
sys = require('sys'),
url = require('url');

exports.createProxy = function(map, options) {
  return new Proxy(map, options);
};

var Proxy = exports.Proxy = function (map_opt, options) {
  if (!map_opt) throw new Error("Please provide a source feed URL or a map");
  var map = [];
  if (typeof map_opt === 'string') {
    var srcURL = url.parse(map);
    var auth = srcURL.auth ? srcURL.auth.split(":") : null;
    
    map = [{
      "out" : "",
      "in" : {
        "host" : srcURL.hostname,
        "port" : srcURL.port,
        "path" : srcURL.pathname + (srcURL.search ? srcURL.search : ""),
        "user" : (auth ? auth[0] : null),
        "password" : (auth ? auth[1] : null)
      }
    }];
  } else {
    for (var p in map_opt) {
      if (!map_opt.hasOwnProperty(p)) continue;
      var srcURL = url.parse(map_opt[p]);
      var auth = srcURL.auth ? srcURL.auth.split(":") : null;
      
      map[map.length] = {
        "out": p,
        "in" : {
          "host" : srcURL.hostname,
          "port" : srcURL.port,
          "path" : srcURL.pathname + (srcURL.search ? srcURL.search : ""),
          "user" : (auth ? auth[0] : null),
          "password" : (auth ? auth[1] : null)
        }
      }
    }
  }

  
  options = options || {};
  this.audienceServer = options.audienceServer || http.createServer();
  var audienceServerPort = options.port || 5080;

  /**
   * Array of the requests to the stream sources.
   * @type Array.<http.ClientRequest>
   */
  this.clientRequests = [];
  
  map.forEach(function(item, index){
    var headers = {'Host': item.host};
    var audienceClients = [];
    
    if (!!options.headers) {
      for (var h in options.headers) {
        if (options.headers.hasOwnProperty(h)) {
          headers[h] = options.headers[h];
        }
      }
    }
    
    /** Add HTTP-auth **/
    if (item.in.user) {
      if (!item.in.password) throw Error('Password for the user not specified');
      
      var auth = 'Basic ' +
        new Buffer(item.in.user + ':' + item.in.password).toString('base64');
    
      headers['Authorization'] = auth;
    }
    
    // Starting the stream on from the source
    var request = http.request({
      host: item.in.host,
      port: item.in.port || 80,
      method: 'GET',
      path: item.in.path,
      headers: headers
    });
    this.clientRequests[index] = request;
    
    request.end();
    request.on('response', function (srcResponse) {
      item.sendResponse = function(req, res) {
        /** Replicate the header from the source **/
        res.writeHead(200, srcResponse.headers);
        /** Push the client into the client list **/
        audienceClients.push(res);
        /** Clean up connections when they're dead **/
        res.socket.on('close', function () {
          audienceClients.splice(audienceClients.indexOf(res), 1);
        });
      };

      /** Send data to relevant clients **/
      srcResponse.setEncoding('binary');
      srcResponse.on('data', function (chunk) {
        var i;
        for (i = audienceClients.length; i--;) {
          // debugger;
          audienceClients[i].write(chunk, 'binary');
        }
      });
    });    
  }, this);
  
  var audienceRoutes = map.map(function(item){
    return item.out.replace(/^([^\/])/, "/$1");
  });
  
  /** Setup Audience server listener **/
  this.audienceServer.on('request', function (req, res) {
    for (var i = audienceRoutes.length; i--;) {
      if (req.url === audienceRoutes[i]) {
        if (typeof map[i].sendResponse === 'function') {
          map[i].sendResponse(req, res);
        }
        return;
      }
    }
    res.writeHead(404);
    res.end('Not found');
    return;
  });

  if (typeof this.audienceServer.fd !== 'number') {
    this.audienceServer.listen(audienceServerPort);
    sys.puts('node-mjpeg-proxy server started on port ' + audienceServerPort);
  }
};

/**
 * Destroy {@link Proxy} instance.
 */
Proxy.prototype.destroy = function () {
  var request = null;
  while (request = this.clientRequests.pop()) {
    request.abort();
  }
  this.audienceServer.close();
};
