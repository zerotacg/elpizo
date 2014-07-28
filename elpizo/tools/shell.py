from elpizo import make_application

import IPython


def main():
  app = make_application()
  IPython.embed(user_ns={"app": app})


if __name__ == "__main__":
  main()
