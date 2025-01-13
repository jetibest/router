# Router

Simple reverse-proxy router for golang with integrated WebUI for configuration.

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
