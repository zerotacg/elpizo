class Record(object):
  """
  An implementation of the active record pattern for a key-value store. The
  subclass must implement `serialize()` and `deserialize()` instance methods, as
  well as define a `KEY_PREFIX`.

  The subclass should also not attempt to deserialize anything to the `id`
  member of the class, as it will be overriden by the ID passed into `find`.
  """

  def __init__(self, id=None, **kwargs):
    """
    A record can be initialized with an ID.
    """
    self.id = id
    self._kvs = None

    for k, v in kwargs.items():
      setattr(self, k, v)

  @classmethod
  def key_for_id(cls, id):
    """
    Get the key-value store key for a given ID.

    :param id: The ID.
    :returns: The key.
    """
    return ".".join([cls.KEY_PREFIX, str(id)])

  @classmethod
  def get_next_id(cls, kvs):
    """
    Get the next monotonically increasing ID for the given record type.

    :param kvs: The key-value store.
    :returns: The fresh ID.
    """
    return kvs.incr(cls.key_for_id("_serial"))

  @property
  def key(self):
    """
    Retrieve the key for persisting to the key-value store.
    """
    return self.key_for_id(self.id)

  def save(self):
    """
    Save the serialized state of the record into the key-value store.

    :param kvs: The key-value store to save to.
    """
    if self.id is None:
      self.id = self.get_next_id(self._kvs)

    self._kvs.set(self.key, self.serialize())

  def load(self):
    """
    Load the most recent version of the record from the key-value store.

    :param kvs: The key-value store to load from.
    """
    self.deserialize(self._kvs.get(self.key))

  @property
  def is_persisted(self):
    """
    Whether or not the the record has an identity mapped to the underlying
    key-value store.
    """
    return self.id is not None and self._kvs is not None

  @classmethod
  def find(cls, id, kvs):
    """
    Find a record from the key-value store by its ID.

    :param id: The ID to find.
    :param kvs: The key-value store to load from.
    :throws KeyError: The record was not found in the underlying key-value
                      store.
    :returns: The record, bound to a key-value store.
    """
    record = cls(id)
    record._kvs = kvs
    record.load()
    return record

  def serialize(self):
    """
    Serialize the record for insertion into the key-value store. It should be
    overriden by subclasses.

    :returns: The serialized representation of the record.
    """
    raise NotImplemented

  def deserialize(self, serialized):
    """
    Deserialize the record for retrieval from the key-value store. It should be
    overriden by subclasses.

    :param serialized: The serialized representation of the record.
    """
    raise NotImplemented


class Store(object):
  def __init__(self, find_func, kvs):
    self.find_func = find_func
    self.kvs = kvs
    self.records = {}

  def find(self, id):
    """
    Get a record with the given ID from the underlying key-value store.

    :param id: The ID to find.
    :throws KeyError: The record was not found in the underlying key-value
                      store.
    :returns: The record, bound to a key-value store.
    """
    if id not in self.records:
      self.records[id] = self.find_func(id, self.kvs)
    return self.records[id]

  def save_all(self):
    """
    Save all records contained by this store to the backing key-value store.
    """
    for record in self.records.values():
      record.save()

  def flush_all(self):
    """
    Flush all records from the underlying cache.
    """
    self.records.clear()
