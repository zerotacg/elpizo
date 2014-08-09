import sqltap
import time

from ..net import Protocol
from .. import game_pb2
from . import handlers


class DebugContext(object):
  def __init__(self, application):
    self.application = application
    self.sessions = {}

  def add_session(self, protocol, sqla):
    ctx = ProtocolDebugContext(protocol, self.application.sqla_factory())
    self.sessions[ctx.id] = ctx

  def get_session(self, protocol):
    return self.sessions[hex(id(protocol))]


class ProtocolDebugContext(object):
  def __init__(self, protocol, sqla):
    self.id = hex(id(protocol))
    self.protocol = protocol
    self.player_id = protocol.get_player(sqla).id

    self.packets = {
        "ws": [],
        "amqp": []
    }

  def kill(self):
    self.protocol = None


def create_profiling_session():
  return sqltap.ProfilingSession(user_context_fn=lambda *args: tuple(args))


def install(application, routes):
  debug_context = DebugContext(application)
  application.debug_context = debug_context

  routes.extend([
      (r"/_debug/", handlers.MainHandler),
      (r"/_debug/admit/", handlers.AdmitHandler),
      (r"/_debug/sessions/(0x[0-9a-f]+)/", handlers.SessionHandler),
      (r"/_debug/sessions/(0x[0-9a-f]+)/packets/(ws|amqp)/(\d+)/", handlers.PacketViewHandler),
      (r"/_debug/sessions/(0x[0-9a-f]+)/packets/(ws|amqp)/(\d+)/queries/(\d+)/", handlers.QueryViewHandler),
  ])

  def get_packet_name(code):
    return Protocol.PACKETS[code].__name__

  # instrument Protocol
  def wrap_on_open(f):
    def _wrapper(self):
      debug_context.add_session(self, application.sqla_factory())
      return f(self)
    return _wrapper

  def wrap_on_close(f):
    def _wrapper(self):
      debug_context.get_session(self).kill()
      return f(self)
    return _wrapper

  def wrap_on_ws_message(f):
    def _wrapper(self, type, origin, message):
      start_time = time.monotonic()
      profiler = create_profiling_session()
      with profiler:
        r = f(self, type, origin, message)
      end_time = time.monotonic()

      debug_context.get_session(self).packets["ws"].append({
          "received": True,
          "type": get_packet_name(type),
          "origin": "",
          "message": message,
          "duration": end_time - start_time,
          "query_stats": profiler.collect()
      })
      return r
    return _wrapper

  def wrap_on_amqp_message(f):
    def _wrapper(self, type, origin, message):
      start_time = time.monotonic()
      profiler = create_profiling_session()
      with profiler:
        r = f(self, type, origin, message)
      end_time = time.monotonic()

      debug_context.get_session(self).packets["amqp"].append({
          "received": True,
          "routing_key": "",
          "type": get_packet_name(type),
          "origin": origin,
          "message": message,
          "duration": end_time - start_time,
          "query_stats": profiler.collect()
      })
      return r
    return _wrapper

  def wrap_publish(f):
    def _wrapper(self, routing_key, origin, message):
      start_time = time.monotonic()
      r = f(self, routing_key, origin, message)
      end_time = time.monotonic()

      debug_context.get_session(self).packets["amqp"].append({
          "received": False,
          "routing_key": routing_key,
          "type": get_packet_name(message.DESCRIPTOR.GetOptions().Extensions[
              game_pb2.packet_type]),
          "origin": origin,
          "message": message,
          "duration": end_time - start_time,
          "query_stats": []
      })
      return r
    return _wrapper

  def wrap_send(f):
    def _wrapper(self, origin, message):
      start_time = time.monotonic()
      r = f(self, origin, message)
      end_time = time.monotonic()

      debug_context.get_session(self).packets["ws"].append({
          "received": False,
          "type": get_packet_name(message.DESCRIPTOR.GetOptions().Extensions[
              game_pb2.packet_type]),
          "origin": origin if origin is not None else "",
          "message": message,
          "duration": end_time - start_time,
          "query_stats": []
      })
      return r
    return _wrapper

  Protocol.on_open = wrap_on_open(Protocol.on_open)
  Protocol.on_close = wrap_on_close(Protocol.on_close)
  Protocol.publish = wrap_publish(Protocol.publish)
  Protocol.send = wrap_send(Protocol.send)
  Protocol.on_ws_message = wrap_on_ws_message(Protocol.on_ws_message)
  Protocol.on_amqp_message = wrap_on_amqp_message(Protocol.on_amqp_message)
