/** @jsx React.DOM */

module React from "react";
module App from "./app.jsx";

React.renderComponent(<App />, document.getElementById("elpizo"));

import {Realm, Region, Entity} from "./map";
import {Renderer} from "./graphics/renderer";
import {repeat} from "./util/collections";
import {Resources, loadImage} from "./util/resources";

var resources = new Resources();

resources.loadBundle({
    "tiles/grass": loadImage("static/img/tiles/grass.png"),
    "tiles/water": loadImage("static/img/tiles/water.png"),
    "entities/tree": loadImage("static/img/entities/tree.png"),
    "entities/man": loadImage("static/img/entities/man.png"),
}).then(function () {
  var renderer = new Renderer(resources);
  var realm = new Realm(16, 16);
  realm.addRegion(new Region(0, 0, repeat(17 * 17, (i) => {
    var x = i % 17;
    var y = Math.floor(i / 17);
    return x == 0 || x == 16 || y == 0 || y == 16 ? "ocean" : "grassland";
  })));
  realm.addEntity(new Entity("bob", "human", "man", 2, 1));
  realm.addEntity(new Entity("foo", "tree", "oak", 2, 3));
  realm.addEntity(new Entity("bar", "tree", "oak", 4, 3));
  realm.addEntity(new Entity("baz", "tree", "oak", 3, 4));
  renderer.setRealm(realm);

  var el = renderer.el;
  el.style.position = "absolute";
  el.style.top = "0px";
  el.style.left = "0px";
  renderer.setScreenViewportSize(1024, 768);
  document.body.appendChild(el);

  renderer.render();
});
