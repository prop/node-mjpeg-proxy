node-mjpeg-proxy
================

This is a simple implementation of a MJPEG proxy written with node.js.

## Documentation

### Multiple sources example
	var mjpegproxy = require("mjpeg-proxy");
	var map = {
    	"cam1" : "http://example1.com:8080/cam1",
    	"cam2" : "http://foo:bar@example2.com/cam2"
    };


	mjpegproxy.createProxy("http://192.1.2.3:8080/videofeed");
	
### Single source example

    var mjpegproxy = require("mjpeg-proxy");
    mjpegproxy.createProxy("http://192.1.2.3:8080/videofeed");

Here, it will create a proxy to the source video feed (http://192.1.2.3:8080/videofeed) with the default options (below). You can now access the feed at http://localhost:5080/ .

### Proxy

    Proxy.createProxy(sourceURL, [options]);
    Proxy.createProxy(map, [options]);

Returns: a `Proxy` instance.

Arguments:

- *sourceURL*

  The source URL of the MJPEG feed to be proxied.

- *map* 
  
  Multiple sources map. See [example] (examples/map-example.json)


Options:

- *port*

  The destination port. Defaults to `5080`.

- *headers*

  Optional headers (e.g. for the authorization).

## TODO

- Stop receiving original stream while no clients request it

## Credits

- Phil Rene ([philrene](http://github.com/philrene))
