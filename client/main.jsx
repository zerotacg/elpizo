/** @jsx React.DOM */

import {Transport} from "./util/net";
import {resources, loadImage} from "./util/resources";

module React from "react";

module App from "./components/app.jsx";

resources.loadBundle({
    "tiles/water": loadImage("img/tiles/water.png"),
    "tiles/beach": loadImage("img/tiles/beach.png"),
    "tiles/dirt": loadImage("img/tiles/dirt.png"),
    "tiles/grass": loadImage("img/tiles/grass.png"),
    "tiles/sand": loadImage("img/tiles/sand.png")
}).then(() => {
  React.renderComponent(<App />, document.getElementById("elpizo"));
});
