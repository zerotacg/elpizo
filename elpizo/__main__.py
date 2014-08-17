import asyncio
import logging

from tornado.platform.asyncio import AsyncIOMainLoop

from tornado.options import options
from tornado.ioloop import IOLoop

from elpizo import make_application

def main():
  AsyncIOMainLoop().install()

  app = make_application()
  app.listen(options.port)
  logging.info("Application starting on port %s.", options.port)
  asyncio.get_event_loop().run_forever()

if __name__ == "__main__":
  main()
