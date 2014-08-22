module events from "events";
module React from "react";
module promise from "es6-promise";
module querystring from "querystring";

module renderer from "client/graphics/renderer";
module handlers from "client/handlers";
module packets from "client/protos/packets";
module net from "client/util/net";
module input from "client/util/input";
module resources from "client/util/resources";
module geometry from "client/models/geometry";
module realm from "client/models/realm";
module ui from "client/ui/main.react";

function waitFor(emitter, event) {
  return new promise.Promise((resolve, reject) => {
    emitter.once(event, resolve);
  });
}

export class Game extends events.EventEmitter {
  constructor(parent) {
    super();

    this.realm = null;
    this.me = null;

    var qs = querystring.parse(window.location.search.substring(1));
    var encodedToken = atob(qs.token);
    this.token = new Uint8Array(encodedToken.length);
    [].forEach.call(encodedToken, (c, i) => {
      this.token[i] = c.charCodeAt(0);
    });

    this.protocol = new net.Protocol(new net.Transport(
        "ws://" + window.location.host + "/socket"));

    this.resources = new resources.Resources();
    this.resourcesLoaded = false;

    this.renderer = new renderer.Renderer(this.resources, parent);
    this.inputState = new input.InputState(window);

    this.uiRoot = document.createElement("div");
    this.uiRoot.className = "ui-root";
    parent.appendChild(this.uiRoot);

    this.uiRootComponent = ui.UI({game: this});

    // Render the React components once.
    this.renderReact();

    handlers.install(this);

    this.renderer.on("refit", this.onRefit.bind(this));
    this.renderer.on("viewportChange", this.onViewportChange.bind(this));

    this.protocol.transport.on("open", this.onTransportOpen.bind(this));
    this.protocol.transport.on("close", this.onTransportClose.bind(this));

    this.setDebug(qs.debug === "on");
    this.running = false;
  }

  getViewportPacket() {
    var bounds = this.renderer.getCacheBounds();
    return new packets.ViewportPacket({
        bounds: {
            left: bounds.left,
            top: bounds.top,
            width: bounds.width,
            height: bounds.height
        }
    });
  }

  setDebug(v) {
    this.debug = v;
    this.renderer.setDebug(v);

    var qs = querystring.parse(window.location.search.substring(1));

    if (!this.debug) {
      delete qs.debug;
    } else {
      qs.debug = "on";
    }

    var path = "/";
    var stringified = querystring.stringify(qs);
    if (stringified.length > 0) {
      path += "?" + stringified;
    }

    window.history.replaceState({}, null, path);

  }

  onRefit(bounds) {
    if (this.me !== null) {
      this.renderer.center(this.me.location);
    }
  }

  onViewportChange(bounds, lastBounds) {
    if (this.realm === null) {
      return;
    }

    var currentTopLeft = bounds.getTopLeft().map(realm.Region.floor);
    var currentBottomRight = bounds.getBottomRight().map(realm.Region.ceil);

    var lastTopLeft = lastBounds.getTopLeft().map(realm.Region.floor);
    var lastBottomRight = lastBounds.getBottomRight().map(realm.Region.ceil);

    if (currentTopLeft.x !== lastTopLeft.x ||
        currentTopLeft.y !== lastTopLeft.y ||
        currentBottomRight.x !== lastBottomRight.x ||
        currentBottomRight.y !== lastBottomRight.y) {
      this.realm.retainRegions(this.renderer.getCacheBounds());
      this.protocol.send(this.getViewportPacket());
    }
  }

  onTransportOpen() {
    this.go();
  }

  onTransportClose() {
    this.stop();
  }

  loadFromManifest(manifest) {
    var bundle = {};

    Object.keys(manifest).forEach(function (fileName) {
      var type = manifest[fileName];
      bundle[fileName] = resources.Resources.TYPES[type]("assets/" + fileName);
    });

    this.resources.loadBundle(bundle).then(() => {
      this.resourcesLoaded = true;
    });
  }

  setRealm(realm) {
    this.realm = realm;
  }

  setAvatarById(id) {
    console.log("Hello! Your player id is:", id);
    this.me = this.realm.getEntity(id);
    this.renderer.center(this.me.location);
    this.protocol.send(this.getViewportPacket());
  }

  update(dt) {
    if (this.inputState.unstick(input.Key.RETURN)) {
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

  renderReact() {
    React.renderComponent(this.uiRootComponent, this.uiRoot);
  }

  startUpdating() {
    var startTime = new Date().valueOf() / 1000;
    var cont = () => {
      var currentTime = new Date().valueOf() / 1000;
      this.update(currentTime - startTime);
      startTime = currentTime;

      if (this.running) {
        window.setTimeout(cont, 0);
      }
    };
    cont();
  }

  startRendering() {
    var startTime = new Date().valueOf() / 1000;
    var cont = () => {
      this.renderReact();
      var currentTime = new Date().valueOf() / 1000;

      if (this.resourcesLoaded) {
        this.render(currentTime - startTime);
      }

      startTime = currentTime;

      if (this.running) {
        window.requestAnimationFrame(cont);
      }
    };
    cont();
  }

  go() {
    this.protocol.send(new packets.HelloPacket({token: this.token || ""}));
    this.running = true;
    this.renderer.refit();
    this.startUpdating();
    this.startRendering();
  }

  stop() {
    this.running = false;
  }
}
