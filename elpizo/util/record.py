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

  def bind(self, kvs):
    """
    Bind the record to a key-value store.

    :param kvs: The key-value store to bind.
    """
    self._kvs = kvs

  def save(self):
    """
    Save the serialized state of the record into the key-value store.

    :param kvs: The key-value store to save to.
    """
    if self.id is None:
      self.id = self._kvs.next_serial()

    self._kvs.set(self.id, self.serialize())

  def delete(self):
    """
    Delete the record from the key-value store.
    """
    self._kvs.delete(self.id)
    self.id = None

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
    record = cls.deserialize(id, kvs.get(id))
    record.bind(kvs)
    return record

  def serialize(self):
    """
    Serialize the record for insertion into the key-value store. It should be
    overriden by subclasses.

    :returns: The serialized representation of the record.
    """
    raise NotImplemented

  @classmethod
  def deserialize(cls, id, serialized):
    """
    Deserialize the record for retrieval from the key-value store. It should be
    overriden by subclasses.

    :param serialized: The serialized representation of the record.
    """
    raise NotImplemented


class Store(object):
  def __init__(self, find_func, kvs):
    self.find = find_func
    self.kvs = kvs
    self.records = {}

  def load(self, id):
    """
    Get a record with the given ID from the underlying key-value store.

    :param id: The ID to find.
    :throws KeyError: The record was not found in the underlying key-value
                      store.
    :returns: The record, bound to a key-value store.
    """
    if id not in self.records:
      record = self.find(id, self.kvs)
      self.add(record)
    return self.records[id]

  def keys(self):
    """
    Get all the persisted keys in the store.
    """
    return self.kvs.keys()

  def load_all(self):
    """
    Load all of the store into memory.
    """
    for key in self.keys():
      self.load(key)

  def create(self, record):
    """
    Save a record into the underlying key-value store.
    """
    record.bind(self.kvs)
    record.save()
    if record.id not in self.records:
      self.add(record)

  def save_all(self):
    """
    Save all records contained by this store to the backing key-value store.
    """
    for record in list(self.records.values()):
      record.save()

  def expire(self, record):
    """
    Remove a record from the cache.
    """
    del self.records[record.id]

  def expire_all(self):
    """
    Purge all records from the underlying cache.
    """
    for record in list(self.records.values()):
      self.expire(record)

  def destroy(self, record):
    """
    Delete a record from the underlying key-value store, and expire it from the
    store.
    """
    self.expire(record)
    record.delete()

  def loaded_records(self):
    """
    Get an iterator to records loaded into the store.

    :returns: The iterator.
    """
    return self.records.items()

  def add(self, record):
    """
    Add a record into the cache.
    """
    self.records[record.id] = record
