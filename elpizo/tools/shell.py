import logging
import threading

import os

from elpizo import server
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
  parser = server.make_config_parser()
  shell.add_parser_arguments(parser)
  conf = parser.parse_args()

  s = shell.Shell(ServerShell, conf, banner1=BANNER)

  if conf.filename is not None:
    with open(conf.filename, "r") as f:
      s.thread.do(s.ex, f.read())
  else:
    s.mainloop()


if __name__ == "__main__":
  main()
