module events from "events";
module React from "react";
module promise from "es6-promise";
module querystring from "querystring";

module renderer from "client/graphics/renderer";
module handlers from "client/handlers";
module packets from "client/protos/packets";
module net from "client/util/net";
module input from "client/util/input";
module objects from "client/util/objects";
module resources from "client/util/resources";
module geometry from "client/models/geometry";
module realm from "client/models/realm";
module ui from "client/ui/main.react";

function waitFor(emitter, event) {
  return new promise.Promise((resolve, reject) =>
    emitter.once(event, resolve));
}

export class Game extends events.EventEmitter {
  constructor(parent) {
    super();

    this.log = [];

    window.onerror = this.onError.bind(this);
    this.lastError = null;

    this.realm = null;
    this.me = null;

    this.running = false;

    this.protocol = new net.Protocol(this, new net.Transport(
        "ws://" + window.location.host + "/socket"));

    this.resources = new resources.Resources();
    this.resourcesLoaded = false;

    this.renderer = new renderer.Renderer(this.resources, parent);
    this.inputState = new input.InputState(window);

    this.uiRoot = document.createElement("div");
    parent.appendChild(this.uiRoot);
    this.uiRootComponent = ui.UI({
        game: this,
        showInventory: false
    });

    // Render the React components once.
    this.renderReact();

    handlers.install(this);

    this.renderer.on("refit", this.onRefit.bind(this));
    this.renderer.on("viewportChange", this.onViewportChange.bind(this));

    this.protocol.transport.on("open", this.onTransportOpen.bind(this));
    this.protocol.transport.on("close", this.onTransportClose.bind(this));

    var qs = querystring.parse(window.location.search.substring(1));
    var encodedToken = atob(qs.token || "");
    this.token = new Uint8Array(encodedToken.length);
    [].forEach.call(encodedToken, (c, i) => {
      this.token[i] = c.charCodeAt(0);
    });

    this.setDebug(qs.debug === "on");
    this.clientBounds = new geometry.Rectangle(0, 0, 0, 0);
  }

  appendToLog(node) {
    this.log.push(node);
  }

  onError(msg, file, lineno, colno, e) {
    this.protocol.transport.close();
    this.lastError = "Internal client error.\n\n" + e.stack.toString();

    try {
      this.renderReact();
    } catch (e) {
      // Something has gone horribly wrong, bail out!
      console.error(e.stack);
    }
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

  onViewportChange() {
    if (this.realm === null) {
      return;
    }

    var bounds = this.renderer.getCacheBounds();

    var toRemove = {};
    var toAdd = {};

    for (var y = this.clientBounds.top;
         y < this.clientBounds.getBottom();
         y += realm.Region.SIZE) {
      for (var x = this.clientBounds.left;
           x < this.clientBounds.getRight();
           x += realm.Region.SIZE) {
        var key = [x, y].join(",");
        toRemove[key] = true;
      }
    }

    for (var y = bounds.top;
         y < bounds.getBottom();
         y += realm.Region.SIZE) {
      for (var x = bounds.left;
           x < bounds.getRight();
           x += realm.Region.SIZE) {
        var key = [x, y].join(",");

        if (objects.hasOwnProp.call(toRemove, key)) {
          delete toRemove[key];
        } else {
          toAdd[key] = true;
        }
      }
    }

    Object.keys(toRemove).forEach((k) => {
      var [x, y] = k.split(",");
      x = parseInt(x, 10);
      y = parseInt(y, 10);

      var location = new geometry.Vector2(x, y);

      if (!this.realm.getBounds().contains(new geometry.Rectangle(
          location.x, location.y, realm.Region.SIZE, realm.Region.SIZE))) {
        return;
      }

      var region = this.realm.getRegionAt(location);
      if (region !== null) {
        this.realm.removeRegion(region);
      }
      this.protocol.send(new packets.UnsightPacket({
          location: location
      }));
    });

    Object.keys(toAdd).forEach((k) => {
      var [x, y] = k.split(",");
      x = parseInt(x, 10);
      y = parseInt(y, 10);

      var location = new geometry.Vector2(x, y);

      if (!this.realm.getBounds().contains(new geometry.Rectangle(
          location.x, location.y, realm.Region.SIZE, realm.Region.SIZE))) {
        return;
      }

      this.protocol.send(new packets.SightPacket({
          location: location
      }));
    });

    this.clientBounds = bounds;
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
  }

  update(dt) {
    if (this.inputState.stick(input.Key.RETURN)) {
      window.setTimeout(() => this.uiRoot.querySelector(".log input").focus(),
                        0);
    }

    if (this.inputState.stick(input.Key.I)) {
      this.uiRootComponent.props.showInventory =
          !this.uiRootComponent.props.showInventory;
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
        window.setTimeout(cont, 1 / 60);
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
