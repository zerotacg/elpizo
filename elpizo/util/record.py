class Record(object):
  """
  An implementation of the active record pattern for a key-value store. The
  subclass must implement `serialize()` and `deserialize()` instance methods.

  The subclass should also not attempt to deserialize anything to the `id`
  member of the class, as it will be overriden by the ID passed into `find`.
  """

  def __init__(self, id=None, **kwargs):
    """
    A record can be initialized with an ID.
    """
    self.id = id
    self._kvs = None
    self.update(**kwargs)

  def update(self, **kwargs):
    """
    Update fields in the record.
    """
    for k, v in kwargs.items():
      setattr(self, k, v)

  @property
  def is_fresh(self):
    return self.id is None


class Store(object):
  def __init__(self, kvs):
    self.kvs = kvs
    self.loaded_records = {}

  @classmethod
  def serialize(cls, record):
    """
    Serialize the record for insertion into the key-value store. It should be
    overriden by subclasses.

    :returns: The serialized representation of the record.
    """
    raise NotImplementedError

  @classmethod
  def deserialize(cls, id, serialized):
    """
    Deserialize the record for retrieval from the key-value store. It should be
    overriden by subclasses.

    :param serialized: The serialized representation of the record.
    """
    raise NotImplementedError

  def find(self, id):
    """
    Find a record from the key-value store by its ID.

    :param id: The ID to find.
    :throws KeyError: The record was not found in the underlying key-value
                      store.
    :returns: The record, bound to a key-value store.
    """
    return self.deserialize(id, self.kvs.get(id))

  def load(self, id):
    """
    Get a record with the given ID from the underlying key-value store.

    :param id: The ID to find.
    :throws KeyError: The record was not found in the underlying key-value
                      store.
    :returns: The record, bound to a key-value store.
    """
    if id not in self.loaded_records:
      record = self.find(id)
      self.add(record)
    return self.loaded_records[id]

  def keys(self):
    """
    Get all the persisted keys in the store.
    """
    return (int(key) for key in self.kvs.keys())

  def load_all(self):
    """
    Load all of the store into memory.
    """
    for key in self.keys():
      yield self.load(key)

  def save(self, record):
    """
    Save a record into the underlying key-value store.
    """
    assert record.id is not None
    self.kvs.set(record.id, self.serialize(record))

  def create(self, record):
    """
    Create a record in the underlying key-value store.
    """
    if record.id is not None:
      raise ValueError("record already exists in data store")

    record.id = self.kvs.next_serial()
    self.save(record)

    if record.id not in self.loaded_records:
      self.add(record)

  def save_all(self):
    """
    Save all records contained by this store to the backing key-value store.
    """
    for record in list(self.loaded_records.values()):
      self.save(record)

  def expire(self, record):
    """
    Remove a record from the cache.
    """
    del self.loaded_records[record.id]

  def expire_all(self):
    """
    Purge all records from the underlying cache.
    """
    for record in list(self.loaded_records.values()):
      self.expire(record)

  def destroy(self, record):
    """
    Delete a record from the underlying key-value store, and expire it from the
    store.
    """
    self.expire(record)
    self.kvs.delete(record.id)
    record.id = None

  def add(self, record):
    """
    Add a record into the cache.
    """
    self.loaded_records[record.id] = record
