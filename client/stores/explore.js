import {EventEmitter} from "events";

import {getExplore} from "../api";
module bus from "../bus";
module exploreActions from "../actions/explore";

var CHANGE_EVENT = "change";

class ExploreStore extends EventEmitter {
  constructor() {
    super();

    this._explore = null;
    this._fetchCalled = false;

    bus.register((payload) => {
      var action = payload.action;

      switch (action.actionType) {
        case exploreActions.UPDATE:
          this._update(action.explore);
          break;

        case exploreActions.FETCH:
          if (!this._fetchCalled) {
            getExplore().then((explore) => {
              this._update(explore);
              this.emitChange();
            });
            this._fetchCalled = true;
          }
          return true;

        default:
          return true;
      }

      this.emitChange();
      return true;
    });
  }

  get() {
    return this._explore;
  }

  _update(explore) {
    this._explore = explore;
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

export default = new ExploreStore();
