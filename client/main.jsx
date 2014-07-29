/** @jsx React.DOM */

module React from "react";
module App from "./app.jsx";

//React.renderComponent(<App />, document.getElementById("elpizo"));

import {Realm, Region} from "./map";
import {Renderer} from "./renderer";
import {repeat} from "./util/collections";
import {Resources, loadImage} from "./util/resources";

var resources = new Resources();

function randomChoice(xs) {
    return xs[Math.floor(xs.length * Math.random())];
}

function rect(xs, width, x, y, w, h) {
  var out = [];

  for (var j = 0; j < h; ++j) {
    var idx = (y + j) * width + x;
    [].push.apply(out, xs.slice(idx, idx + w));
  }

  return out;
}

resources.loadBundle({
    "tiles/grass": loadImage("static/img/tiles/grass.png"),
    "tiles/water": loadImage("static/img/tiles/water.png")
}).then(function () {
  var realm = new Realm(32, 32);
  var corners = repeat((realm.aw + 1) * (realm.ah + 1), () =>
      randomChoice(["grassland", "ocean"]));

  realm.addRegion(new Region(0, 0, rect(corners, realm.aw + 1, 0, 0, 17, 17)));
  realm.addRegion(new Region(0, 1, rect(corners, realm.aw + 1, 0, 16, 17, 17)));
  realm.addRegion(new Region(1, 0, rect(corners, realm.aw + 1, 16, 0, 17, 17)));
  realm.addRegion(new Region(1, 1, rect(corners, realm.aw + 1, 16, 16, 17, 17)));

  var renderer = new Renderer(resources);
  renderer.setRealm(realm);

  var canv = renderer.terrainCanvas;
  canv.style.position = "absolute";
  canv.style.top = "0px";
  canv.style.left = "0px";
  renderer.setScreenViewportSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(canv);
  renderer.render();
});
