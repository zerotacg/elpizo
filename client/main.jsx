/** @jsx React.DOM */

module React from "react";
module App from "./app.jsx";

React.renderComponent(<App />, document.getElementById("elpizo"));

import {Realm, Region} from "./map";
import {Renderer} from "./renderer";
import {repeat} from "./util/collections";
import {Resources, loadImage} from "./util/resources";

var resources = new Resources();

resources.loadBundle({
    "tiles/grass": loadImage("static/img/tiles/grass.png"),
    "tiles/water": loadImage("static/img/tiles/water.png")
}).then(function () {
  var renderer = new Renderer(resources);

  var el = renderer.el;
  el.style.position = "absolute";
  el.style.top = "0px";
  el.style.left = "0px";
  renderer.setScreenViewportSize(1024, 768);
  document.body.appendChild(el);

  renderer.render();
});
