/** @jsx React.DOM */

import {Transport} from "./net";
import {Resources, loadImage} from "./resources";

module React from "react";

module App from "./app.jsx";

var resources = new Resources();

resources.loadBundle({
    "tiles/water": loadImage("img/tiles/water.png"),
    "tiles/dirt": loadImage("img/tiles/dirt.png"),
    "tiles/grass": loadImage("img/tiles/grass.png")
}).then((r) => {
  React.renderComponent(<App
      transport={new Transport("/events")}
      resources={resources}
  />, document.getElementById("elpizo"));
});
