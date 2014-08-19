import logging
from tornado.options import define, options, parse_command_line, \
                            parse_config_file

define("conf", default="elpizo.conf", help="Configuration file")
define("port", default="9999", help="Port to listen on")
define("debug", default=False, help="Run in debug mode")
define("dsn", default="", help="Database DSN to connect to")
define("amqp_server", default="localhost", help="AMQP server to connect to")
define("statsd_server", default="localhost", help="statsd server to connect to")
define("mint_public_key", default="elpizo.pub", help="Public key of the mint")


def make_application():
  # We parse the command line to get the value of --conf.
  parse_command_line()

  # We parse the config file to get all config variables.
  parse_config_file(options.conf)

  # We parse the command line again to extract overriding command line flags.
  parse_command_line()

  if options.debug:
    logging.info("Application is running in debug mode.")

  from elpizo.application import Application

  app = Application(debug=options.debug, amqp_server=options.amqp_server,
                    statsd_server=options.statsd_server,
                    dsn=options.dsn, mint_public_key=options.mint_public_key)

  return app
