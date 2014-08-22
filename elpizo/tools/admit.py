import base64
import sys

from elpizo import server
from elpizo.server import config
from urllib import parse


def do_mint(server, credentials, expiry):
  token = base64.b64encode(server.mint.mint(credentials.encode("utf-8"),
                                            expiry=expiry)) \
      .decode("utf-8")
  print(token)

  print("")
  print("http://localhost:8081/?token=" + parse.quote(token))


def main():
  parser = config.make_parser()
  parser.add_argument("credentials", help="Credentials to mint.")
  parser.add_argument("--expiry",
                      help="When to expire credentials. NOTE: Credentials "
                           "cannot be revoked without generating a new minting "
                           "key pair!",
                      default=1000000)
  args = parser.parse_args()

  server.Server(args).once(do_mint, args.credentials, args.expiry)


if __name__ == "__main__":
  main()
