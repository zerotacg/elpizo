import sqlalchemy
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.types import *

Base = declarative_base()

def basic_primary_key():
  return sqlalchemy.Column(Integer, primary_key=True, nullable=False)
