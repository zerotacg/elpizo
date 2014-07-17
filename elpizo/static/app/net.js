"use strict";

var util = require("./util");

function Transport(host) {
  util.EventEmitter.call(this);

  this.host = host;
  this.connect();
  this.opened = false;

  this.socket.onclose = function (e) {
    console.warn("Socket died, reconnecting.");
    this.connect();
    this.opened = true;
    this.emit("close");
  }.bind(this);
}

Transport.prototype = new util.EventEmitter();

Transport.prototype.connect = function () {
  this.socket = new SockJS(this.host);

  this.socket.onopen = function (e) {
    this.opened = true;
    this.emit("open");
  }.bind(this);

  this.socket.onmessage = function (e) {
    var parts = e.data.split(":");
    var channel = parts[0];
    var message = JSON.parse(parts.slice(1).join(":"));
    this.emit("message", channel, message);
  }.bind(this);
};

Transport.prototype.send = function (channel, message) {
  this.socket.send([channel, JSON.stringify(message)].join(":"));
};

Transport.prototype.close = function () {
  this.socket.close();
}

function Protocol(channel, transport) {
  util.EventEmitter.call(this);

  this.channel = channel;
  this.transport = transport;

  if (this.transport.opened) {
    this.emit("open");
  }

  this.transport.on("message", function (channel, message) {
    if (channel === this.channel) {
      this.emit("message", message);
    }
  }.bind(this));

  this.transport.on("open", this.emit.bind(this, "open"));
  this.transport.on("close", this.emit.bind(this, "close"));
}

Protocol.prototype = new util.EventEmitter();

Protocol.prototype.send = function (message) {
  this.transport.send(this.channel, message);
};

module.exports = {
  Transport: Transport,
  Protocol: Protocol
};
