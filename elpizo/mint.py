import struct
import time

from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA
from Crypto.Signature import PKCS1_PSS


class InvalidTokenError(Exception):
  pass


class Mint(object):
  TIMESTAMP_FORMAT = "I"

  def __init__(self, key_file, hashfunc=SHA256):
    self.hashfunc = hashfunc

    rsa = RSA.importKey(key_file.read())

    self.rsa_key_size = (rsa.size() + 1) // 8
    self.signer = PKCS1_PSS.new(rsa)

  def mint(self, body, expiry=10 * 60, ts=None):
    if ts is None:
      ts = time.time()

    expires = int(ts + expiry)

    envelope = struct.pack(self.TIMESTAMP_FORMAT, expires) + body
    sig = self.signer.sign(self.hashfunc.new(envelope))

    return sig + envelope

  def unmint(self, token, ts=None):
    if ts is None:
      ts = time.time()

    sig = token[:self.rsa_key_size]
    envelope = token[self.rsa_key_size:]

    if not self.signer.verify(self.hashfunc.new(envelope), sig):
      raise InvalidTokenError("Signature mismatch")

    expires, = struct.unpack_from(self.TIMESTAMP_FORMAT, envelope)

    if ts >= expires:
      raise InvalidTokenError("Token expired")

    return envelope[struct.calcsize(self.TIMESTAMP_FORMAT):]
