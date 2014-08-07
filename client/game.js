import {EventEmitter} from "events";
import {Promise} from "es6-promise";

import {Renderer} from "./graphics/renderer";
import {Transport, Protocol} from "./util/net";
import {Resources} from "./util/resources";
import {InputState} from "./util/input";

module game_pb2 from "./game_pb2";
module handlers from "./handlers";

function waitFor(emitter, event) {
  return new Promise((resolve, reject) => {
    emitter.once(event, resolve);
  });
}

export class Game extends EventEmitter {
  constructor(parent) {
    super();

    this.realm = null;
    this.me = null;

    this.protocol = new Protocol(new Transport(
        "ws://" + window.location.host + "/socket"));
    this.resources = new Resources();
    this.renderer = new Renderer(this.resources, parent);
    this.inputState = new InputState(window);

    handlers.install(this);

    Promise.all([
        waitFor(this.protocol.transport, "open"),
        waitFor(this.resources, "bundleLoaded")
    ]).then(() => {
      this.emit("ready");
    });
  }

  loadResources(bundle) {
    this.resources.loadBundle(bundle);
  }

  setRealm(realm) {
    this.realm = realm;
    this.renderer.setRealm(realm);
  }

  setAvatarById(id) {
    this.me = this.realm.getEntity(id);
  }

  update(dt) {
    // Update the realm first.
    if (this.realm !== null) {
      this.realm.update(dt);
    }

    // Handle avatar updates.
    if (this.me !== null) {
      this.me.updateAsAvatar(dt, this.inputState, this.protocol);
    }

    // Now render.
    this.renderer.render(dt);
  }

  go() {
    this.protocol.send(
        new game_pb2.ViewportPacket(this.renderer.getAbsoluteWorldBounds()));

    var startTime = new Date().valueOf() / 1000;
    var cont = () => {
      var currentTime = new Date().valueOf() / 1000;
      this.update(currentTime - startTime);
      startTime = currentTime;
      window.requestAnimationFrame(cont);
    };
    cont();
  }
}
