module React from "react";

import {EventEmitter} from "events";
import {Promise} from "es6-promise";

import {Renderer} from "./graphics/renderer";
import {Transport, Protocol} from "./util/net";
import {Resources} from "./util/resources";
import {InputState} from "./util/input";
import {UI} from "./ui/main.react";

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

    this.uiRoot = document.createElement("div");
    this.uiRoot.className = "ui-root";
    parent.appendChild(this.uiRoot);

    this.uiRootComponent = UI({game: this});

    handlers.install(this);

    this.renderer.on("viewportChange", (bounds) => {
      this.protocol.send(new game_pb2.ViewportPacket(bounds));
    });

    Promise.all([
        waitFor(this.protocol.transport, "open"),
        waitFor(this.resources, "bundleLoaded")
    ]).then(() => {
      this.emit("ready");
    });
  }

  loadFromManifest(manifest) {
    var bundle = {};

    Object.keys(manifest).forEach(function (fileName) {
      var type = manifest[fileName];
      bundle[fileName] = Resources.TYPES[type]("static/assets/" + fileName);
    });

    this.resources.loadBundle(bundle);
  }

  setRealm(realm) {
    this.realm = realm;
    this.renderer.setRealm(realm);
  }

  setAvatarById(id) {
    console.log("Hello! Your player id is:", id);
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
  }

  render(dt) {
    this.renderer.render(dt);
  }

  startUpdating() {
    var startTime = new Date().valueOf() / 1000;
    var cont = () => {
      var currentTime = new Date().valueOf() / 1000;
      this.update(currentTime - startTime);
      startTime = currentTime;
      window.setTimeout(cont, 0);
    };
    cont();
  }

  startRendering() {
    var startTime = new Date().valueOf() / 1000;
    var cont = () => {
      React.renderComponent(this.uiRootComponent, this.uiRoot);

      var currentTime = new Date().valueOf() / 1000;
      this.render(currentTime - startTime);
      startTime = currentTime;
      window.requestAnimationFrame(cont);
    };
    cont();
  }

  go() {
    this.renderer.refit();
    this.startUpdating();
    this.startRendering();
  }
}
