import base64
import socket
import sys

from elpizo import platform
from urllib import parse


def do_mint(app, credentials, expiry):
  token = base64.b64encode(app.mint.mint(credentials.encode("utf-8"),
                                         expiry=expiry)) \
      .decode("utf-8")
  print(token)

  print("")
  print("http://" + socket.gethostname() + ":8081/?token=" +
      parse.quote(token))


def main():
  parser = platform.make_config_parser()
  parser.add_argument("credentials", help="Credentials to mint.")
  parser.add_argument("--token-expiry",
                      help="When to expire credentials. NOTE: Credentials "
                           "cannot be revoked without generating a new minting "
                           "key pair!", type=int, default=100)
  args = parser.parse_args()

  platform.Application(args).once(do_mint, args.credentials, args.token_expiry)


if __name__ == "__main__":
  main()
