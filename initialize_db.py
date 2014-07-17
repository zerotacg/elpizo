#!/usr/bin/env python3

from elpizo import make_application
from elpizo.models import Base, User, Player

if __name__ == "__main__":
  app = make_application()

  input("This will DELETE ALL DATA! Press ENTER to continue or CTRL+C to abort. ")
  Base.metadata.drop_all(bind=app.sqla_session.bind)
  Base.metadata.create_all(bind=app.sqla_session.bind)

  victor_hugo = User()
  victor_hugo.name = "victor_hugo"
  app.sqla_session.add(victor_hugo)

  valjean = Player()
  valjean.name = "Valjean"
  valjean.user = victor_hugo
  app.sqla_session.add(valjean)

  dumas = User()
  dumas.name = "dumas"
  app.sqla_session.add(dumas)

  athos = Player()
  athos.name = "Athos"
  athos.user = dumas
  app.sqla_session.add(athos)

  aramis = Player()
  aramis.name = "Aramis"
  aramis.user = dumas
  app.sqla_session.add(aramis)

  porthos = Player()
  porthos.name = "Porthos"
  porthos.user = dumas
  app.sqla_session.add(porthos)

  app.sqla_session.commit()

  print("Reinitialized database.")
