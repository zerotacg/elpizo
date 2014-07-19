module SockJS from "./util/sockjs-shim";

import {EventEmitter} from "./util/events";

export class Transport extends EventEmitter {
  constructor(host) {
    super();

    this.host = host;
    this.connect();
    this.opened = false;
  }

  connect() {
    this.socket = new SockJS(this.host);

    this.socket.onopen = (e) => {
      this.opened = true;
      this.emit("open");
    };

    this.socket.onclose = (e) => {
      console.warn("Socket died.");
      //this.connect();
      this.emit("close");
    };

    this.socket.onmessage = (e) => {
      var parts = e.data.split(":");
      var channel = parts[0];
      var message = JSON.parse(parts.slice(1).join(":"));
      this.emit("message", channel, message);
    };
  }

  send(channel, message) {
    this.socket.send([channel, JSON.stringify(message)].join(":"));
  }

  close() {
    this.socket.close();
  }
}

export class Protocol extends EventEmitter {
  constructor(channel, transport) {
    super();

    this.channel = channel;
    this.transport = transport;

    if (this.transport.opened) {
      // We have to wait for this frame to end before emitting open, since
      // the caller needs to set callbacks.
      setTimeout(this.emit.bind(this, "open"), 0);
    }

    this.transport.on("message", (channel, message) => {
      if (channel === this.channel) {
        this.emit("message", message);
      }
    });

    this.transport.on("open", this.emit.bind(this, "open"));
    this.transport.on("close", this.emit.bind(this, "close"));
  }

  send(message) {
    this.transport.send(this.channel, message);
  }
}
