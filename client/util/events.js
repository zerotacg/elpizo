import {hasOwnProp} from "./objects";

export class EventEmitter {
  constructor() {
    this._handlers = {};
  }

  _getHandlers(name) {
    return this._handlers[name] = this._handlers[name] || [];
  }

  on(name, handler) {
    this._getHandlers(name).push(handler);
  }

  off(name, handler) {
    var handlers = this._getHandlers(name);
    var i = handlers.indexOf(handler);

    if (i !== -1) {
      handlers.splice(i, 1);
    }
  }

  allOff(name) {
    delete this._handlers[name];
  }

  emit(name) {
    var args = [].slice.call(arguments, 1);

    this._getHandlers(name).forEach((handler) => {
      handler.apply(this, args);
    });
  }
}
