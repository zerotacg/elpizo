from elpizo import config


def make_parser(*args, **kwargs):
  parser = config.make_parser(*args, **kwargs)
  parser.add_argument("--connect-uri", action="store",
                      default="ws://localhost:8081/socket",
                      help="Address to connect to.")
  return parser
