from . import chat, error, move, private


def configure(application):
  application.on_open_hooks = [
      chat.on_open,
      move.on_open,
      private.on_open
  ]

  application.sockjs_endpoints = {
      "chat": chat.socket_chat
  }

  application.amqp_endpoints = {
      "chat": chat.mq_chat,
      "error": error.mq_error
  }
