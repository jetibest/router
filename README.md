# Router

Simple reverse-proxy router for golang with integrated WebUI for configuration.

It runs a HTTP webserver, and allows for configuring multiple routes that lead a path to a certain backend server.
For example, a route with path `/app1` might refer to the backend `http://127.0.0.1:8081`, so that a request to `/app1/somewhere/` makes the Router make a request to `http://127.0.0.1:8081/somewhere/` and return its response.

Not any website or webapp can be set as a backend server, since absolute URL's and redirects among others may break the reverse proxy.
For more advanced use-cases, try using other webservers capable of reverse-proxy, such as HAProxy or Nginx.

# Installation

    go build && ./router ./router_config.json

Now navigate in the browser to the configured address to add routes through the WebUI, by default: http://localhost:8080/router/

The specified configuration file in the command-line defaults to `/etc/router.json`.

# TODO

- Test WebSockets and others
- Improve the graphical interface design of the WebUI
- Add more settings to WebUI such as its own WebUI path, timeouts, verbosity level (logging), etc.
- Multiple backends for the same path, but possibly with different conditions or round-robin.
- Keep track of statistics and usage (number of unique clients, list of unique paths, etc.)
- ???
