import {EventEmitter} from "events";

import {Directions} from "../models";
import {repeat} from "../util/collections";
import {makeColorForString} from "../util/colors";
import {hasOwnProp, extend} from "../util/objects";
import {debounce} from "../util/functions";
module coords from "../util/coords";

module sprites from "../assets/sprites";
module models from "../models";

export class Renderer extends EventEmitter {
  constructor(resources, parent) {
    super();

    this.el = document.createElement("div");
    this.el.classList.add("renderer");
    this.el.style.position = "relative";
    this.el.onclick = this.handleOnClick.bind(this);

    parent.appendChild(this.el);

    this.terrainCanvas = this.createCanvas();
    this.terrainCanvas.style.zIndex = 0;
    this.el.appendChild(this.terrainCanvas);

    this.entityCanvas = this.createCanvas();
    this.entityCanvas.style.zIndex = 1;
    this.el.appendChild(this.entityCanvas);

    this.xrayCanvas = this.createCanvas();
    this.xrayCanvas.style.zIndex = 2;
    this.xrayCanvas.style.opacity = 0.25;
    this.el.appendChild(this.xrayCanvas);

    this.aTopLeft = {
        ax: 0,
        ay: 0
    };

    this.resources = resources;
    this.realm = null;

    this.regionTerrainCache = {};
    this.elapsed = 0;

    window.onresize = debounce(() => {
      this.refit();
    }, 500);

    this.style = window.getComputedStyle(this.el);
  }

  handleOnClick(e) {
    var sx = e.clientX - this.sBounds.left;
    var sy = e.clientY - this.sBounds.top;
    var aCoords = this.screenToAbsoluteCoords({sx: sx, sy: sy});
    this.emit("click", {
        ax: Math.floor(aCoords.ax + this.aTopLeft.ax),
        ay: Math.floor(aCoords.ay + this.aTopLeft.ay),
    });
  }

  prepareContext(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.font = this.style.font;
    return ctx;
  }

  createCanvas() {
    var canvas = document.createElement("canvas");
    extend(canvas.style, {
        position: "absolute",
        left: "0px",
        top: "0px",
        width: "100%",
        height: "100%"
    });
    return canvas;
  }

  absoluteToScreenCoords(location) {
    return {
        sx: location.ax * Renderer.TILE_SIZE,
        sy: location.ay * Renderer.TILE_SIZE
    };
  }

  screenToAbsoluteCoords(location) {
    return {
        ax: location.sx / Renderer.TILE_SIZE,
        ay: location.sy / Renderer.TILE_SIZE
    };
  }

  setScreenViewportSize(sw, sh) {
    this.el.style.width = sw + "px";
    this.el.style.height = sh + "px";
    this.sBounds = this.el.getBoundingClientRect();

    this.terrainCanvas.width = sw;
    this.terrainCanvas.height = sh;

    this.entityCanvas.width = sw;
    this.entityCanvas.height = sh;

    this.xrayCanvas.width = sw;
    this.xrayCanvas.height = sh;

    this.emit("viewportChange", this.getAbsoluteWorldBounds());
  }

  refit() {
    this.setScreenViewportSize(window.innerWidth, window.innerHeight);
  }

  getScreenViewportSize() {
    return {
        sw: this.sBounds.width,
        sh: this.sBounds.height
    };
  }

  getAbsoluteWorldBounds() {
    var viewport = this.getScreenViewportSize();
    var absoluteWorldBounds = this.screenToAbsoluteCoords({
        sx: viewport.sw,
        sy: viewport.sh
    });

    return {
        aLeft: this.aTopLeft.ax,
        aTop: this.aTopLeft.ay,
        aRight: this.aTopLeft.ax + Math.ceil(absoluteWorldBounds.ax),
        aBottom: this.aTopLeft.ay + Math.ceil(absoluteWorldBounds.ay),
    };
  }

  getRegionWorldBounds() {
    var aBounds = this.getAbsoluteWorldBounds();

    var arTopLeft = coords.absoluteToContainingRegion({
        ax: aBounds.aLeft,
        ay: aBounds.aTop
    });

    var arBottomRight = coords.absoluteToContainingRegion({
        ax: aBounds.aRight,
        ay: aBounds.aBottom
    });

    return {
        arLeft: Math.floor(arTopLeft.arx),
        arTop: Math.floor(arTopLeft.ary),
        arRight: Math.floor(arBottomRight.arx) + 1,
        arBottom: Math.floor(arBottomRight.ary) + 1
    };
  }

  setRealm(realm) {
    this.realm = realm;
    this.regionTerrainCache = {};
  }

  render(dt) {
    if (this.realm === null) {
      return;
    }

    this.elapsed += dt;

    this.renderTerrain(this.realm);
    this.renderEntities(this.realm);
  }

  renderTerrain(realm) {
    var screenViewportSize = this.getScreenViewportSize();

    var regionScreenSize =
        this.absoluteToScreenCoords({ax: coords.REGION_SIZE, ay: coords.REGION_SIZE});

    var ctx = this.prepareContext(this.terrainCanvas);
    ctx.clearRect(0, 0, this.terrainCanvas.width, this.terrainCanvas.height);

    var sOffset = this.absoluteToScreenCoords({
        ax: -this.aTopLeft.ax,
        ay: -this.aTopLeft.ay
    });

    var arWorldBounds = this.getRegionWorldBounds();

    // Only render the chunks in bounded by the viewport.
    for (var ary = arWorldBounds.arTop; ary < arWorldBounds.arBottom; ++ary) {
      for (var arx = arWorldBounds.arLeft; arx < arWorldBounds.arRight; ++arx) {
        var sPosition = this.absoluteToScreenCoords(
            coords.regionToAbsolute({arx: arx, ary: ary}));

        var sLeft = Math.round(sOffset.sx + sPosition.sx);
        var sTop = Math.round(sOffset.sy + sPosition.sy);

        var key = [arx, ary].join(",");
        var region = realm.getRegion({arx: arx, ary: ary});

        if (region === null) {
          continue;
        }

        // If this region hasn't been rendered yet, then we render it and add it
        // to the cache.
        if (!hasOwnProp.call(this.regionTerrainCache, key)) {
          this.regionTerrainCache[key] =
              this.renderRegionTerrainAsBuffer(region);
        }

        var buffer = this.regionTerrainCache[key];
        ctx.drawImage(buffer, sLeft, sTop);
      }
    }
  }

  renderEntities(realm) {
    var ctx = this.prepareContext(this.entityCanvas);
    ctx.clearRect(0, 0, this.entityCanvas.width, this.entityCanvas.height);

    var xrayCtx = this.prepareContext(this.xrayCanvas);
    xrayCtx.clearRect(0, 0, this.xrayCanvas.width, this.xrayCanvas.height);

    var aWorldBounds = this.getAbsoluteWorldBounds();

    var numBuckets = Math.ceil(aWorldBounds.aBottom - aWorldBounds.aTop);

    var sortedEntities = realm.getAllEntities()
        .filter(
            (entity) => entity.location.ay >= aWorldBounds.aTop &&
                        entity.location.ay < aWorldBounds.aBottom)
        .sort((a, b) => {
            // Always sort drops below everything else.
            if (a instanceof models.Drop) {
              return -1;
            } else if (b instanceof models.Drop) {
              return 1;
            }

            return a.location.ay - b.location.ay;
        });

    // Render in two passes - opaque items in the first pass, and xrayable in
    // the second.
    sortedEntities.forEach((entity) => {
      this.renderEntity(entity, ctx);

      if (entity instanceof models.Actor) {
        this.renderEntity(entity, xrayCtx);
      }
    });
  }

  renderRegionTerrainAsBuffer(region) {
    var canvas = document.createElement("canvas");
    var size = this.absoluteToScreenCoords({
        ax: coords.REGION_SIZE,
        ay: coords.REGION_SIZE
    });

    canvas.width = size.sx;
    canvas.height = size.sy;

    var ctx = this.prepareContext(canvas);

    region.terrain.forEach((terrain, i) => {
      var rx = i % coords.REGION_SIZE;
      var ry = Math.floor(i / coords.REGION_SIZE);

      // If we have a tile named all the terrain joined together, we use that
      // instead of compositing terrain.
      var combinedTileName = terrain.map((terrain) => terrain.name).join(",");
      if (hasOwnProp.call(Renderer.TILE_TEXTURE_MAPPINGS, combinedTileName)) {
        terrain = [{
            name: combinedTileName,
            mask: terrain[terrain.length - 1].mask
        }];
      }

      terrain.forEach((layer) => {
        var texture = Renderer.TILE_TEXTURE_MAPPINGS[layer.name];
        Renderer.TILE_TEXTURE_COORDS[layer.mask].forEach((offset, index) => {
          // The offset selects which tile from the atlas to use. It assumes the
          // atlas is 6 half-tiles wide.
          var u = offset % 6;
          var v = Math.floor(offset / 6);

          // dx and dy indicate how many half-tiles in the half-tile needs to be
          // offset by. They should be in clockwise order, starting from NW.
          var dx = [0, 1, 0, 1][index];
          var dy = [0, 0, 1, 1][index];

          var s = this.absoluteToScreenCoords({
              ax: rx + dx / 2,
              ay: ry + dy / 2
          });

          ctx.drawImage(this.resources.get("tiles/" + texture),
                        u * Renderer.TILE_SIZE / 2, v * Renderer.TILE_SIZE / 2,
                        Renderer.TILE_SIZE / 2, Renderer.TILE_SIZE / 2,
                        s.sx, s.sy,
                        Renderer.TILE_SIZE / 2, Renderer.TILE_SIZE / 2);
        });
      });
    });

    return canvas;
  }

  renderEntity(entity, ctx) {
    var sOffset = this.absoluteToScreenCoords({
        ax: entity.location.ax - this.aTopLeft.ax,
        ay: entity.location.ay - this.aTopLeft.ay
    });

    ctx.save();
    ctx.translate(sOffset.sx, sOffset.sy);
    Renderer.ENTITIES[entity.type](entity, this.resources, ctx, this.elapsed);
    ctx.restore();
  }
}

Renderer.ENTITIES = {
    Actor: (entity, resources, ctx, elapsed) => {
      var state = entity.moving ? "walking" : "standing";
      var direction = entity.direction == Directions.N ? "n" :
                      entity.direction == Directions.W ? "w" :
                      entity.direction == Directions.S ? "s" :
                      entity.direction == Directions.E ? "e" :
                      null;

      var names = [["Body", entity.gender, entity.body].join(".")];

      if (entity.facial) {
        names.push(["Facial", entity.gender, entity.facial].join("."));
      }

      if (entity.hair) {
        names.push(["Hair", entity.gender, entity.hair].join("."));
      }

      [].push.apply(names, entity.equipment.map((equipment) =>
          ["Equipment", entity.gender, equipment.type].join(".")));

      names.forEach((name) => {
          sprites[name][state][direction]
              .render(resources, ctx, elapsed * entity.speed);
      })
    },

    Fixture: (entity, resources, ctx, elapsed) => {
      sprites[["Fixture", entity.fixtureType.name].join(".")]
          .render(resources, ctx, elapsed);
    },

    Drop: (entity, resources, ctx, elapsed) => {
      sprites[["Item", entity.item.type].join(".")]
          .render(resources, ctx, elapsed);
    },

    Player: (entity, resources, ctx, elapsed) => {
      Renderer.ENTITIES.Actor(entity, resources, ctx, elapsed);
      ctx.textAlign = "center";
      ctx.fillStyle = "black";
      ctx.fillText(entity.name, 17, -23);
      ctx.fillStyle = makeColorForString(entity.name);
      ctx.fillText(entity.name, 16, -24);
    }
};

Renderer.TILE_SIZE = 32;

Renderer.TILE_TEXTURE_MAPPINGS = {
    "grassland": "grass.png",
    "ocean": "water.png",
    "river": "water.png",
    "lakeshore": "water.png",
    "grassland,lakeshore": "water-grass.png",
    "lake": "water.png",
    "beach": "beach.png",
    "ocean,beach": "beach.png",
    "subtropical_desert": "sand.png"
};

Renderer.TILE_TEXTURE_COORDS = {
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
