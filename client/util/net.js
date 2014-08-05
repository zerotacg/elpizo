module game_pb2 from "../game_pb2";

import {hasOwnProp} from "./objects";

import {EventEmitter} from "events";

export class Transport extends EventEmitter {
  constructor(host) {
    super();

    this.host = host;
    this.connect();
    this.opened = false;
  }

  connect() {
    this.socket = new WebSocket(this.host);
    this.socket.binaryType = "arraybuffer";

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
      this.emit("message", game_pb2.Packet.decode(e.data));
    };
  }

  send(packet) {
    this.socket.send(packet.encode().buffer);
  }

  close() {
    this.socket.close();
  }
}

var PACKETS = {};
Object.keys(game_pb2).forEach((name) => {
  var cls = game_pb2[name];
  if (!hasOwnProp.call(cls.$options, "(packetType)")) {
    return;
  }

  var packetType = game_pb2.Packet.Type[cls.$options["(packetType)"]];
  PACKETS[packetType] = cls;
});

export class Protocol extends EventEmitter {
  constructor(transport) {
    super();

    this.transport = transport;

    if (this.transport.opened) {
      // We have to wait for this frame to end before emitting open, since
      // the caller needs to set callbacks.
      setTimeout(this.emit.bind(this, "open"), 0);
    }

    this.transport.on("message", (packet) => {
      var message = PACKETS[packet.type].decode(packet.payload);
      console.log(message);
      this.emit(packet.type, packet.origin, message);
    });
  }

  send(type, message) {
    this.transport.send(new game_pb2.Packet({
        type: type,
        payload: message.encode()
    }));
  }
}

