module React from "react";

import {EventEmitter} from "events";
import {Promise} from "es6-promise";

import {Renderer} from "./graphics/renderer";
import {Transport, Protocol} from "./util/net";
import {Resources} from "./util/resources";
import {InputState, Key} from "./util/input";
import {UI} from "./ui/main.react";

module coords from "./util/coords";
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

    this.renderer.on("refit", (bounds) => {
      if (this.me !== null) {
        this.renderer.center(this.me.location);
      }
    });

    this.renderer.on("viewportChange", (bounds, lastBounds) => {
      if (this.realm === null) {
        return;
      }

      var currentArTopLeft = coords.absoluteToContainingRegion(
          {ax: bounds.aLeft,
           ay: bounds.aTop});
      var currentArBottomRight = coords.absoluteToContainingRegion(
          {ax: bounds.aRight + coords.REGION_SIZE,
           ay: bounds.aBottom + coords.REGION_SIZE})

      var lastArTopLeft = coords.absoluteToContainingRegion(
          {ax: lastBounds.aLeft,
           ay: lastBounds.aTop});
      var lastArBottomRight = coords.absoluteToContainingRegion(
          {ax: lastBounds.aRight + coords.REGION_SIZE,
           ay: lastBounds.aBottom + coords.REGION_SIZE})

      if (currentArTopLeft.arx !== lastArTopLeft.arx ||
          currentArTopLeft.ary !== lastArTopLeft.ary ||
          currentArBottomRight.arx !== lastArBottomRight.arx ||
          currentArBottomRight.ary !== lastArBottomRight.ary) {
        this.realm.retainRegions(this.renderer.getRegionCacheBounds());
        this.protocol.send(new game_pb2.ViewportPacket(
            this.renderer.getRegionCacheBounds()));
      }
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
  }

  setAvatarById(id) {
    console.log("Hello! Your player id is:", id);
    this.me = this.realm.getEntity(id);
    this.renderer.center(this.me.location);
    this.protocol.send(new game_pb2.ViewportPacket(
        this.renderer.getRegionCacheBounds()));
  }

  update(dt) {
    if (this.inputState.unstick(Key.RETURN)) {
      window.setTimeout(() => this.uiRoot.querySelector(".chat input").focus(),
                        0);
    }

    // Update the realm first.
    if (this.realm !== null) {
      this.realm.update(dt);
    }

    // Handle avatar updates.
    if (this.me !== null) {
      this.me.updateAsAvatar(dt, this.inputState, this.protocol);
      this.renderer.center(this.me.location);
    }
  }

  render(dt) {
    if (this.realm !== null) {
      this.renderer.render(this.realm, dt);
    }
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
