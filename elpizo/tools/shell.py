import logging
import threading

import os

from elpizo import server
from elpizo.server import config
from elpizo.util import shell

logger = logging.getLogger(__name__)


class ServerShell(server.Application):
  def on_start(self):
    super().on_start()

    if self.store.is_locked():
      logger.warn("""\
The store is locked. Do NOT try to write to the store!

If you're sure that breaking the lock is okay (make very VERY sure), run:

    app.store.unlock()
""")


BANNER = """\
elpizo.tools.shell

If you intend to write to the store, acquire a lock first:

    app.store.lock()

When you're finished:

    app.store.save_all()
    app.store.unlock()

app     -> An instance of elpizo.server.server.Application.
"""


def main():
  shell.Shell(ServerShell, config.make_parser().parse_args(),
              banner1=BANNER).mainloop()


if __name__ == "__main__":
  main()
