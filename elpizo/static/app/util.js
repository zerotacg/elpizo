"use strict";

function EventEmitter() {
  this._handlers = {};
}

EventEmitter.prototype._getHandlers = function (name) {
  var handlers = this._handlers[name] = this._handlers[name] || [];
  return handlers;
};

EventEmitter.prototype.on = function (name, handler) {
  this._getHandlers(name).push(handler);
};

EventEmitter.prototype.off = function (name, handler) {
  var handlers = this._getHandlers(name);
  var i = handlers.indexOf(handler);

  if (i !== -1) {
    handlers.splice(i, 1);
  }
};

EventEmitter.prototype.allOff = function (name) {
  delete this._handlers[name];
};

EventEmitter.prototype.emit = function (name) {
  var args = [].slice.call(arguments, 1);

  this._getHandlers(name).forEach(function (handler) {
    handler.apply(this, args);
  }.bind(this));
};

module.exports = {
  EventEmitter: EventEmitter
};
