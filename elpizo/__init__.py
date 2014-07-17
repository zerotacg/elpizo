import logging
from tornado.options import define, options, parse_command_line, \
                            parse_config_file

define("conf", default="elpizo.conf", help="Configuration file")
define("port", default="9999", help="Port to listen on")
define("debug", default=False, help="Run in debug mode")
define("dsn", default="", help="Database DSN to connect to")
define("amqp_server", default="localhost", help="AMQP server to connect to")
define("cookie_secret", default="change_me", help="Cookie secret to use")


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
                    dsn=options.dsn, cookie_secret=options.cookie_secret)

  return app
