module retry from "retry";

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
      this.opened = false;
      this.emit("close");
    };

    this.socket.onmessage = (e) => {
      this.currentRetryOperation = null;
      this.emit("message", game_pb2.Packet.decode(e.data));
    };
  }

  send(packet) {
    this.socket.send(packet.encodeAB());
  }

  close() {
    this.socket.close();
  }
}

var PACKETS = {};
Object.keys(game_pb2).forEach((name) => {
  var cls = game_pb2[name];
  if (!hasOwnProp.call(cls.$options, "(packet_type)")) {
    return;
  }

  var packetType = game_pb2.Packet.Type[cls.$options["(packet_type)"]];
  PACKETS[packetType] = cls;
});

export class Protocol extends EventEmitter {
  constructor(transport) {
    super();

    this.transport = transport;

    this.lastError = null;
    this.currentRetryOperation = null;

    this.transport.on("message", (packet) => {
      var message = PACKETS[packet.type].decode(packet.payload);
      if (packet.type === game_pb2.Packet.Type.ERROR) {
        this.lastError = message;
      }
      this.emit(packet.type, packet.origin, message);
    });

    this.transport.on("close", () => {
      if (this.lastError !== null) {
        return;
      }

      if (this.currentRetryOperation === null) {
        this.currentRetryOperation = retry.operation();
        this.currentRetryOperation.attempt(() => {
          this.connect();
        });
      } else {
        this.currentRetryOperation.retry(e);
      }
    });
  }

  send(message) {
    this.transport.send(new game_pb2.Packet({
        type: message.$type.options["(packet_type)"],
        payload: message.encode()
    }));
  }
}

