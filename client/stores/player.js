import {EventEmitter} from "events";

import {getPlayer} from "../api";
module bus from "../bus";
module playerActions from "../actions/player";

var CHANGE_EVENT = "change";

class PlayerStore extends EventEmitter {
  constructor() {
    super();

    this._player = null;
    this._fetchCalled = false;

    bus.register((payload) => {
      var action = payload.action;

      switch (action.actionType) {
        case playerActions.UPDATE:
          this._update(action.player);
          this.emitChange();
          break;

        case playerActions.FETCH:
          if (!this._fetchCalled) {
            getPlayer().then((player) => {
              this._update(player);
              this.emitChange();
            });
            this._fetchCalled = true;
          }
          break;
      }

      return true;
    });
  }

  get() {
    return this._player;
  }

  _update(player) {
    this._player = player;
  }

  emitChange() {
    this.emit(CHANGE_EVENT);
  }

  addChangeListener(callback) {
    this.on(CHANGE_EVENT, callback);
  }

  removeChangeListener(callback) {
    this.on(CHANGE_EVENT, callback);
  }
}

export default = new PlayerStore();
