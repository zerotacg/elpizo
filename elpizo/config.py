import argparse


def make_parser(*args, **kwargs):
  parser = argparse.ArgumentParser(
      *args, formatter_class=argparse.ArgumentDefaultsHelpFormatter, **kwargs)
  parser.add_argument("--debug", action="store_const", default=False, const=True,
                      help="Whether or not to run the server in debug mode.")
  parser.add_argument("--log-level", action="store", default="INFO",
                      help="Logging level to use.")
  parser.add_argument("--mint-key", action="store", default="elpizo.pub",
                      help="Mint key to use.")
  return parser
