import logging
import os
import threading

from elpizo import client
from elpizo.client import config
from elpizo.protos import packets_pb2
from elpizo.util import net
from elpizo.util import shell


logger = logging.getLogger(__name__)


class ClientShellProtocol(net.Protocol):
  def __init__(self, token, *args, **kwargs):
    self.token = token
    super().__init__(*args, **kwargs)

  def on_open(self):
    logger.info("Client protocol opened.")
    self.send(None, packets_pb2.HelloPacket(token=self.token))

  def on_close(self):
    logger.info("Client protocol closed.")
    os._exit(1)

  def on_message(self, origin, message):
    print(type(message).__name__)
    print(origin)
    print(message)


class ShellClient(client.Client):
  def make_protocol(self, transport):
    return ClientShellProtocol(self.token, transport)

  def on_start(self):
    self.token = self.mint.mint(self.config.credentials.encode("utf-8"),
                                self.config.token_expiry)
    super().on_start()

  def on_stop(self):
    os._exit(1)


BANNER = """\
elpizo.tools.client_shell

app     -> An instance of elpizo.client.client.Client.
"""


def main():
  parser = config.make_parser()
  parser.add_argument("credentials", help="Credentials to mint.")
  parser.add_argument("--token-expiry",
                      help="When to expire credentials. NOTE: Credentials "
                           "cannot be revoked without generating a new minting "
                           "key pair!", type=int, default=100)

  shell.Shell(ShellClient, parser.parse_args(), banner1=BANNER).mainloop()


if __name__ == "__main__":
  main()
