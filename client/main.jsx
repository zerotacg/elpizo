/** @jsx React.DOM */

module React from "react";
module App from "./app.jsx";

//React.renderComponent(<App />, document.getElementById("elpizo"));

import {Realm, Region, Entity} from "./map";
import {Renderer} from "./graphics/renderer";
import {repeat} from "./util/collections";
import {Resources, loadImage} from "./util/resources";

module coords from "./util/coords";

var resources = new Resources();

resources.loadBundle({
    "tiles/grass": loadImage("static/img/tiles/grass.png"),
    "tiles/water": loadImage("static/img/tiles/water.png"),
    "entities/tree": loadImage("static/img/entities/tree.png"),
    "entities/man": loadImage("static/img/entities/man.png"),
}).then(function () {
  var renderer = new Renderer(resources);
  var realm = new Realm(32, 32);
  var corners = repeat(17 * 17, (i) => {
    var x = i % 17;
    var y = Math.floor(i / 17);
    return x == 0 || x == 16 || y == 0 || y == 16 ? "ocean" : "grassland";
  });
  realm.addRegion(new Region(0, 0, corners));
  realm.addRegion(new Region(0, 1, corners));
  realm.addRegion(new Region(1, 0, corners));
  realm.addRegion(new Region(1, 1, corners));
  var bob = new Entity("bob", "human", "man", 2, 1);
  realm.addEntity(bob);
  realm.addEntity(new Entity("foo", "tree", "oak", 2, 3));
  realm.addEntity(new Entity("bar", "tree", "oak", 4, 3));
  realm.addEntity(new Entity("baz", "tree", "oak", 3, 4));
  renderer.setRealm(realm);

  var el = renderer.el;
  el.style.position = "absolute";
  el.style.top = "0px";
  el.style.left = "0px";
  document.body.appendChild(el);
  renderer.setScreenViewportSize(1024, 768);

  var startTime = new Date().valueOf();

  renderer.on("click", (aCoords) => {
    var path = realm.computePath(bob.ax, bob.ay, aCoords.ax, aCoords.ay);
    var ax = bob.ax;
    var ay = bob.ay;

    var current = renderer.absoluteToScreenCoords(ax, ay);
    current.sx += 16;
    current.sy += 16;

    bob.ax = aCoords.ax;
    bob.ay = aCoords.ay;
    renderer.render(0);

    var ctx = renderer.entityCanvas.getContext("2d");
    ctx.strokeStyle = "blue";;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(current.sx, current.sy);
    path.forEach((step) => {
      var sStep = renderer.absoluteToScreenCoords(step.ax, step.ay);
      current.sx += sStep.sx;
      current.sy += sStep.sy;
      ctx.lineTo(current.sx, current.sy);
    });
    ctx.stroke();
  });

  renderer.render(0);
});
