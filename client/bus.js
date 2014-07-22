import {EventEmitter} from "events";
import {Promise} from "es6-promise";

var VIEW_ACTION_SOURCE = "view-action";

class Bus {
  constructor() {
    this._callbacks = [];
    this._promises = [];
  }

  register(callback) {
    this._callbacks.push(callback);
    return this._callbacks.length - 1;
  }

  dispatch(payload) {
    var resolves = [];
    var rejects = [];

    this._promises = this._callbacks.map((_, i) => {
      return new Promise((resolve, reject) => {
        resolves[i] = resolve;
        rejects[i] = reject;
      });
    });

    this._callbacks.forEach((callback, i) => {
      Promise.resolve(callback(payload)).then(
          () => resolves[i](payload),
          () => rejects[i](new Error("bus dispatch failed")));
    });

    this._promises = [];
  }

  handleViewAction(action) {
    this.dispatch({
        source: VIEW_ACTION_SOURCE,
        action: action
    });
  }
}

export default = new Bus();
