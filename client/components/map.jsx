/** @jsx React.DOM */

module React from "react";

import {postExploreMove} from "../api";
import {nubStrings} from "../util/collections";
import {resources} from "../util/resources";

module names from "../constants/names";

module exploreStore from "../stores/explore";
module exploreActions from "../actions/explore";

var TEX_COORDS = {
    0x1: [28, 29, 34, 35], // ne convex corner
    0x2: [24, 25, 30, 31], // nw convex corner
    0x3: [26, 27, 32, 32], // going n
    0x4: [48, 49, 54, 55], // sw convex corner
    0x5: [16,  3, 22,  9], // saddle ne->sw
    0x6: [36, 37, 42, 43], // going w
    0x7: [16, 17, 22, 23], // nw concave corner
    0x8: [52, 53, 58, 59], // se convex corner
    0x9: [40, 41, 46, 47], // going e
    0xa: [ 4, 15, 10, 21], // saddle nw->se
    0xb: [14, 15, 20, 21], // ne concave corner
    0xc: [50, 51, 56, 57], // going s
    0xd: [ 2,  3,  8,  9], // se concave corner
    0xe: [ 4,  5, 10, 11], // sw concave corner
    0xf: [38, 39, 44, 45], // all
};

function computeTiles(corners, width, height, precedence, blends) {
  var tiles = [];

  for (var j = 0; j < height; ++j) {
    for (var i = 0; i < width; ++i) {
      var layers = [];

      var nw = corners[(j + 0) * (width + 1) + (i + 0)];
      var ne = corners[(j + 0) * (width + 1) + (i + 1)];
      var sw = corners[(j + 1) * (width + 1) + (i + 0)];
      var se = corners[(j + 1) * (width + 1) + (i + 1)];

      var types = nubStrings([nw, ne, sw, se]
        .sort((a, b) => precedence.indexOf(a) - precedence.indexOf(b)));

      types.forEach((name, i) => {
        var above = types.slice(i).concat(blends[name] || []);

        var variant = ((above.indexOf(nw) !== -1) << 3) |
                      ((above.indexOf(ne) !== -1) << 2) |
                      ((above.indexOf(se) !== -1) << 1) |
                      ((above.indexOf(sw) !== -1) << 0);
        layers.push({
          name: name,
          variant: variant
        });
      });

      tiles.push(layers);
    }
  }
  return tiles;
}

class _Avatar {
  render() {
    return <span className="avatar" style={{
        left: this.props.x * TILE_SIZE,
        top: (this.props.y - 1) * TILE_SIZE,
    }}></span>;
  }
}
var Avatar = React.createClass(_Avatar.prototype);

var TERRAIN_PRECEDENCE = [
    "ocean", "beach",
    "subtropical_desert", "tropical_seasonal_forest", "grassland",
    "tropical_rain_forest",
    "lake", "river", "lakeshore"
];
var TILE_MAPPINGS = {
    "beach": "beach",
    "river": "water",
    "ocean": "water",
    "lakeshore": "water",
    "lake": "water",
    "subtropical_desert": "sand"
};
var TERRAIN_BLENDS = {
    "lakeshore": ["ocean", "lake", "river"],
    "river": ["ocean", "lake"],
    "lake": ["ocean"]
};
var TILE_SIZE = 32;

class _Map {
  getInitialState() {
    return {
        width: 1024,
        height: 768,
        defaultAvatarX: 8,
        defaultAvatarY: 9,
        avatarX: 8,
        avatarY: 9,
        explore: exploreStore.get()
    };
  }

  _onChange() {
    this.setState({
        explore: exploreStore.get()
    });
    this.draw();
  }

  componentWillMount() {
    exploreActions.fetch();
  }

  componentDidMount() {
    exploreStore.addChangeListener(this._onChange);
  }

  componentWillUnmount() {
    exploreStore.removeChangeListener(this._onChange);
  }

  getTilesCanvasContext() {
    return this.getDOMNode().querySelector("canvas.tiles").getContext("2d");
  }

  getHighlightCanvasContext() {
    return this.getDOMNode().querySelector("canvas.highlight").getContext("2d");
  }

  draw() {
    var ctx = this.getTilesCanvasContext();

    if (!this.state.explore) {
      return;
    }

    var map = this.state.explore.map;

    ctx.clearRect(0, 0, this.state.width, this.state.height);
    if (map.corners.length === 0) {
      return;
    }

    var tiles = computeTiles(map.corners.map((id) => names.terrain[id]),
                             map.w, map.h,
                             TERRAIN_PRECEDENCE, TERRAIN_BLENDS);

    // The logic below was originally intended for a pannable map.
    for (var sy = 0; sy < Math.floor(this.state.height / TILE_SIZE); ++sy) {
      for (var sx = 0; sx < Math.floor(this.state.width / TILE_SIZE); ++sx) {
        var xy = this.convertScreenSpaceToWorldSpace(sx, sy);
        var i = xy.x - map.x;
        var j = xy.y - map.y;

        if (i < 0 || j < 0 ||
            i >= map.w ||
            j >= map.h) {
          continue;
        }

        tiles[j * map.w + i].forEach((tile) => {
          TEX_COORDS[tile.variant].forEach((ti, w) => {
            var u = ti % 6;
            var v = Math.floor(ti / 6);

            var di = [0, 1, 0, 1][w];
            var dj = [0, 0, 1, 1][w];

            // TODO: || "grass" isn't an acceptable substitute
            ctx.drawImage(resources.get("tiles/" + (TILE_MAPPINGS[tile.name] || "grass")),
                          u * TILE_SIZE / 2, v * TILE_SIZE / 2,
                          TILE_SIZE / 2, TILE_SIZE / 2,
                          sx * TILE_SIZE + di * TILE_SIZE / 2,
                          sy * TILE_SIZE + dj * TILE_SIZE / 2,
                          TILE_SIZE / 2, TILE_SIZE / 2);
          });
        });
      }
    }
  }

  convertScreenSpaceToWorldSpace(sx, sy) {
    return {
        x: this.state.explore.tile.x + sx - this.state.defaultAvatarX,
        y: this.state.explore.tile.y + sy - this.state.defaultAvatarY
    };
  }

  render() {
    return <div className="map" onClick={this.onClick}
                onMouseMove={this.onMouseMove}
                onMouseLeave={this.onMouseLeave}>
      <Avatar x={this.state.avatarX} y={this.state.avatarY} />
      <canvas width={this.state.width} height={this.state.height}
              className="highlight" />
      <canvas width={this.state.width} height={this.state.height}
              className="tiles" />
    </div>;
  }

  onClick(e) {
    var rect = this.getDOMNode().getBoundingClientRect();
    var sx = Math.floor((e.pageX - rect.left) / TILE_SIZE);
    var sy = Math.floor((e.pageY - rect.top) / TILE_SIZE);

    this.setState({
        avatarX: sx,
        avatarY: sy
    });

    postExploreMove(this.convertScreenSpaceToWorldSpace(sx, sy))
        .then((explore) => {
          exploreActions.update(explore);
          return explore;
        })
        .then((explore) => {
          this.setState({
              avatarX: this.state.defaultAvatarX,
              avatarY: this.state.defaultAvatarY
          });
          return explore;
        }, () => {
          this.setState({
              avatarX: this.state.defaultAvatarX,
              avatarY: this.state.defaultAvatarY
          });
        });

    var ctx = this.getHighlightCanvasContext();
    ctx.clearRect(0, 0, this.state.width, this.state.height);
  }

  onMouseMove(e) {
    var rect = this.getDOMNode().getBoundingClientRect();
    var sx = Math.floor((e.pageX - rect.left) / TILE_SIZE);
    var sy = Math.floor((e.pageY - rect.top) / TILE_SIZE);

    var ctx = this.getHighlightCanvasContext();
    ctx.clearRect(0, 0, this.state.width, this.state.height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(sx * TILE_SIZE, sy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  onMouseLeave(e) {
    var ctx = this.getHighlightCanvasContext();
    ctx.clearRect(0, 0, this.state.width, this.state.height);
  }
}
var Map = React.createClass(_Map.prototype);

export default = Map;
