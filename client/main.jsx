/** @jsx React.DOM */

module React from "react";
module App from "./app.jsx";

import {Transport, Protocol} from "./util/net";

//React.renderComponent(<App />, document.getElementById("elpizo"));

import {Realm, Region, Entity, Directions, getDirectionVector} from "./models";
import {Renderer} from "./graphics/renderer";
import {repeat} from "./util/collections";
import {Resources, loadImage} from "./util/resources";
module names from "./constants/names";

var resources = new Resources();

resources.loadBundle({
    "sprites.fixture.tree.oak":
        loadImage("static/img/fixture/tree/oak.png"),

    "sprites.body.male.light":
        loadImage("static/img/body/male/light.png"),

    "sprites.facial.beard.brown":
        loadImage("static/img/facial/beard/brown.png"),

    "sprites.hair.messy1.brown":
        loadImage("static/img/hair/messy1/brown.png"),

    "sprites.torso.shirt.white_longsleeve_male":
        loadImage("static/img/torso/shirt/white_longsleeve_male.png"),

    "sprites.legs.pants.teal_pants_male":
        loadImage("static/img/legs/pants/teal_pants_male.png"),

    "sprites.feet.shoes.brown_shoes_male":
        loadImage("static/img/feet/shoes/brown_shoes_male.png"),

    "tiles.grass":
        loadImage("static/img/tiles/grass.png"),

    "tiles.water":
        loadImage("static/img/tiles/water.png")
}).then(function () {
  var keysDown = {};
  window.onkeydown = (e) => {
    keysDown[e.which] = true;
  };
  window.onkeyup = (e) => {
    delete keysDown[e.which];
  };

  var renderer = new Renderer(resources);

  var el = renderer.el;
  el.style.position = "absolute";
  el.style.top = "0px";
  el.style.left = "0px";
  document.body.appendChild(el);
  renderer.setScreenViewportSize(1024, 768);

  var protocol = new Protocol(new Transport("/sockjs"));
  protocol.transport.on("open", () => {
    protocol.send("viewport", renderer.getAbsoluteWorldBounds())
  });

  var realm = null;
  protocol.on("realm", (message) => {
    realm = new Realm(message.realm.id, message.realm.name, message.realm.size);
  });

  protocol.on("region", (message) => {
    if (message.region.position.realmId !== realm.id) {
      console.warn("Got invalid region realm ID (" + message.region.realmId +
                   ") for current realm (" + realm.id + "), discarding.");
      return;
    }
    var region = new Region(
        message.region.position,
        message.region.corners.map((id) => names.terrain[id]));
    realm.addRegion(region);
  });

  protocol.on("entity", (message) => {
    if (message.entity.position.realmId !== realm.id) {
      console.warn("Got invalid region realm ID (" +
                   message.entity.position.realmId + ") for current realm (" +
                   realm.id + "), discarding.");
      return;
    }
    var entity = new Entity(message.entity.id, message.entity.name, [
        "body.male.light"
    ], message.entity.position, message.entity.direction, []);
    realm.addEntity(entity);
  });

  protocol.on("avatar", (message) => {
    var me = realm.getEntity(message.entityId);
    renderer.setRealm(realm);

    var startTime = new Date().valueOf() / 1000;
    var cont = () => {
      var currentTime = new Date().valueOf() / 1000;
      var dt = currentTime - startTime;

      // Update the realm first.
      if (realm !== null) {
        realm.update(dt);
      }

      // Handle some movement updates.
      // TODO: validate timing server-side.
      if (me.remainder === 0) {
        var direction = keysDown[37] ? Directions.W :
                        keysDown[38] ? Directions.N :
                        keysDown[39] ? Directions.E :
                        keysDown[40] ? Directions.S :
                        null;

        if (direction !== null) {
          me.moveInDirection(direction);
          protocol.send("move", {direction: direction});
        }
      }

      // Now render.
      renderer.render(dt);

      startTime = currentTime;
      window.requestAnimationFrame(cont);
    };
    cont();
  });

  protocol.on("move", (message) => {
    var entity = realm.getEntity(message.origin);
    entity.moveInDirection(message.direction);
  });

});
