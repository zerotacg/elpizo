/** @jsx React.DOM */

module React from "react";
module App from "./app.jsx";

//React.renderComponent(<App />, document.getElementById("elpizo"));

import {Realm, Region, Entity, Directions} from "./map";
import {Renderer} from "./graphics/renderer";
import {repeat} from "./util/collections";
import {Resources, loadImage} from "./util/resources";

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
  var renderer = new Renderer(resources);
  var realm = new Realm({aw: 32, ah: 32});
  var corners = repeat(17 * 17, (i) => {
    var x = i % 17;
    var y = Math.floor(i / 17);
    return x == 0 || x == 16 || y == 0 || y == 16 ? "ocean" : "grassland";
  });
  realm.addRegion(new Region({arx: 0, ary: 0}, corners));
  realm.addRegion(new Region({arx: 0, ary: 1}, corners));
  realm.addRegion(new Region({arx: 1, ary: 0}, corners));
  realm.addRegion(new Region({arx: 1, ary: 1}, corners));
  var bob = new Entity("bob", [
      "body.male.light",
      "facial.beard.brown",
      "hair.messy1.brown"
  ], {ax: 2, ay: 1}, Directions.S, [
      {type: "torso.shirt.white_longsleeve_male"},
      {type: "legs.pants.teal_pants_male"},
      {type: "feet.shoes.brown_shoes_male"}
  ]);
  window._bob = bob;
  realm.addEntity(bob);
  realm.addEntity(new Entity("foo", ["fixture.tree.oak"], {ax: 2, ay: 3}, Directions.N, []));
  realm.addEntity(new Entity("bar", ["fixture.tree.oak"], {ax: 4, ay: 3}, Directions.N, []));
  realm.addEntity(new Entity("baz", ["fixture.tree.oak"], {ax: 3, ay: 4}, Directions.N, []));
  renderer.setRealm(realm);

  var el = renderer.el;
  el.style.position = "absolute";
  el.style.top = "0px";
  el.style.left = "0px";
  document.body.appendChild(el);
  renderer.setScreenViewportSize(1024, 768);

  var startTime = new Date().valueOf();

  renderer.on("click", (aCoords) => {
    var path = bob.moveTo(aCoords.ax, aCoords.ay);
    console.log(path);
  });

  var cont = () => {
    var currentTime = new Date().valueOf();
    var dt = currentTime - startTime;
    realm.update(dt);
    renderer.render(dt);
    window.requestAnimationFrame(cont);

    startTime = currentTime;
  };
  cont();
});
