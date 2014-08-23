import argparse


def make_parser(*args, **kwargs):
  parser = argparse.ArgumentParser(
      *args, formatter_class=argparse.ArgumentDefaultsHelpFormatter, **kwargs)
  parser.add_argument("--debug", action="store_const", default=False, const=True,
                      help="Whether or not to run the server in debug mode.")
  parser.add_argument("--log-level", action="store", default="INFO",
                      help="Logging level to use.")
  parser.add_argument("--bind-host", action="store", default="localhost",
                      help="Host to bind to.")
  parser.add_argument("--bind-port", action="store", default=8765, type=int,
                      help="Port to bind to.")
  parser.add_argument("--redis-host", action="store", default="localhost",
                      help="Redis host to connect to.")
  parser.add_argument("--redis-port", action="store", default=6379, type=int,
                      help="Redis port to connect to.")
  parser.add_argument("--statsd-host", action="store", default="localhost",
                      help="statsd host to connect to.")
  parser.add_argument("--statsd-port", action="store", default=8125, type=int,
                      help="statsd port to connect to.")
  parser.add_argument("--mint-key", action="store", default="elpizo.pub",
                      help="Mint key to use.")
  return parser
