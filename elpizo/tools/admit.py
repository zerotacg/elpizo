import base64
import sys
import yaml

from elpizo import server
from urllib import parse


def do_mint(server, credentials):
  token = base64.b64encode(server.mint.mint(credentials.encode("utf-8"),
                                            expiry=1000000)) \
      .decode("utf-8")
  print(token)

  print("")
  print("http://localhost:8081/?token=" + parse.quote(token))


def main():
  with open("elpizo.conf") as config_file:
    config = yaml.load(config_file)
  server.Server(config).once(do_mint, sys.argv[1])


if __name__ == "__main__":
  main()
