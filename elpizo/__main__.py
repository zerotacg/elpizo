import logging

from tornado.options import options
from tornado.ioloop import IOLoop

from elpizo import make_application

def main():
  app = make_application()
  app.listen(options.port)
  logging.info("Application starting on port %s.", options.port)
  IOLoop.instance().start()

if __name__ == "__main__":
  main()
