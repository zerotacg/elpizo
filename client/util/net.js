module SockJS from "./sockjs";

import {EventEmitter} from "events";

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
      this.emit("message", JSON.parse(e.data));
    };
  }

  send(message) {
    this.socket.send(JSON.stringify(message));
  }

  close() {
    this.socket.close();
  }
}

export class Protocol extends EventEmitter {
  constructor(transport) {
    super();

    this.transport = transport;

    if (this.transport.opened) {
      // We have to wait for this frame to end before emitting open, since
      // the caller needs to set callbacks.
      setTimeout(this.emit.bind(this, "open"), 0);
    }

    this.transport.on("message", (message) => {
      this.emit(message.type, message);
    });
  }

  send(type, message) {
    message.type = type;
    this.transport.send(message);
  }
}
