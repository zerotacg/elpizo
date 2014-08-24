from elpizo import config


def make_parser(*args, **kwargs):
  parser = config.make_parser(*args, **kwargs)
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
  return parser
