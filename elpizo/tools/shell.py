import logging
import threading

import os

from elpizo import server
from elpizo.server import config
from elpizo.util import shell

logger = logging.getLogger(__name__)


BANNER = """\
elpizo.tools.shell

app     -> An instance of elpizo.server.server.Application.
"""


def main():
  shell.Shell(server.Application, config.make_parser().parse_args(),
              banner1=BANNER).mainloop()


if __name__ == "__main__":
  main()
