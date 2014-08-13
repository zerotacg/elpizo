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

    this.debug = false;

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
    this.currentRealm = null;

    this.regionTerrainCache = {};
    this.elapsed = 0;

    window.onresize = debounce(() => {
      this.refit();
    }, 500);

    this.style = window.getComputedStyle(this.el);

    this.sBounds = {
        left: 0,
        top: 0,
        width: 0,
        height: 0
    };
  }

  damage(region) {
    // Evict a region and its neighbors from the cache ("damaging"). In theory,
    // the renderer should keep track of damaged regions itself, so this is a
    // horrible hack.
    for (var ary = region.location.ary - 1;
         ary <= region.location.ary + 1;
         ++ary) {
      for (var arx = region.location.arx - 1;
           arx <= region.location.arx + 1;
           ++arx) {
        delete this.regionTerrainCache[arx + "," + ary];
      }
    }
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

  center(aPosition) {
    var bounds = this.getAbsoluteViewportBounds();

    this.setAbsoluteTopLeft(
        aPosition.ax - Math.round((bounds.aRight - bounds.aLeft) / 2),
        aPosition.ay - Math.round((bounds.aBottom - bounds.aTop) / 2));
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

  setAbsoluteTopLeft(ax, ay) {
    var previous = this.getAbsoluteViewportBounds();
    this.aTopLeft.ax = ax;
    this.aTopLeft.ay = ay;
    this.emit("viewportChange", this.getAbsoluteViewportBounds(), previous);
  }

  setScreenViewportSize(sw, sh) {
    var previous = this.getAbsoluteViewportBounds();

    this.el.style.width = sw + "px";
    this.el.style.height = sh + "px";
    this.sBounds = this.el.getBoundingClientRect();

    this.terrainCanvas.width = sw;
    this.terrainCanvas.height = sh;

    this.entityCanvas.width = sw;
    this.entityCanvas.height = sh;

    this.xrayCanvas.width = sw;
    this.xrayCanvas.height = sh;
    this.emit("viewportChange", this.getAbsoluteViewportBounds(), previous);
  }

  refit() {
    this.setScreenViewportSize(window.innerWidth, window.innerHeight);
    this.emit("refit", this.getScreenViewportSize());
  }

  getScreenViewportSize() {
    return {
        sw: this.sBounds.width,
        sh: this.sBounds.height
    };
  }

  getAbsoluteViewportBounds() {
    var viewportSize = this.getScreenViewportSize();
    var absoluteViewportSize = this.screenToAbsoluteCoords({
        sx: viewportSize.sw,
        sy: viewportSize.sh
    });

    return {
        aLeft: this.aTopLeft.ax,
        aTop: this.aTopLeft.ay,
        aRight: this.aTopLeft.ax + Math.ceil(absoluteViewportSize.ax),
        aBottom: this.aTopLeft.ay + Math.ceil(absoluteViewportSize.ay),
    };
  }

  getRegionCacheBounds() {
    var viewport = this.getAbsoluteViewportBounds();

    var arTopLeft = coords.absoluteToContainingRegion({
        ax: viewport.aLeft - coords.REGION_SIZE,
        ay: viewport.aTop - coords.REGION_SIZE
    });

    var arBottomRight = coords.absoluteToContainingRegion({
        ax: viewport.aRight + coords.REGION_SIZE,
        ay: viewport.aBottom + coords.REGION_SIZE
    });

    return {
        arLeft: arTopLeft.arx,
        arTop: arTopLeft.ary,
        arRight: arBottomRight.arx + 1,
        arBottom: arBottomRight.ary + 1
    }
  }

  getRegionWorldBounds() {
    var aBounds = this.getAbsoluteViewportBounds();

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

  render(realm, dt) {
    this.elapsed += dt;

    this.renderTerrain(realm);
    this.renderEntities(realm);
  }

  renderTerrain(realm) {
    var arWorldBounds = this.getRegionWorldBounds();

    if (realm !== this.currentRealm) {
      this.regionTerrainCache = {};
      this.currentRealm = realm;
    } else {
      // Evict parts of the terrain cache to keep it synchronized with realm
      // regions.
      Object.keys(this.regionTerrainCache).forEach((k) => {
        if (!realm.regions[k]) {
          delete this.regionTerrainCache[k];
        }
      });
    }

    var screenViewportSize = this.getScreenViewportSize();

    var regionScreenSize = this.absoluteToScreenCoords({
        ax: coords.REGION_SIZE,
        ay: coords.REGION_SIZE
    });

    var ctx = this.prepareContext(this.terrainCanvas);
    ctx.clearRect(0, 0, this.terrainCanvas.width, this.terrainCanvas.height);

    var sOffset = this.absoluteToScreenCoords({
        ax: -this.aTopLeft.ax,
        ay: -this.aTopLeft.ay
    });

    // Only render the regions bounded by the viewport. The vertical bounds has
    // one additional region to allow for rendering cliffs.
    for (var ary = arWorldBounds.arTop; ary < arWorldBounds.arBottom + 1; ++ary) {
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
        ctx.save();
        ctx.translate(sLeft, sTop - buffer.height + regionScreenSize.sy);
        ctx.drawImage(buffer, 0, 0);

        if (this.debug) {
          ctx.translate(0, buffer.height - regionScreenSize.sy);
          ctx.strokeStyle = "red";
          ctx.fillStyle = "red";
          ctx.strokeRect(0, 0,
                         regionScreenSize.sx, regionScreenSize.sy);
          ctx.textAlign = "center";
          ctx.fillText(key, regionScreenSize.sx / 2, regionScreenSize.sy / 2);
        }
        ctx.restore();
      }
    }
  }

  renderEntities(realm) {
    var ctx = this.prepareContext(this.entityCanvas);
    ctx.clearRect(0, 0, this.entityCanvas.width, this.entityCanvas.height);

    var xrayCtx = this.prepareContext(this.xrayCanvas);
    xrayCtx.clearRect(0, 0, this.xrayCanvas.width, this.xrayCanvas.height);

    var aWorldBounds = this.getAbsoluteViewportBounds();

    var numBuckets = Math.ceil(aWorldBounds.aBottom - aWorldBounds.aTop);

    var sortedEntities = realm.getAllEntities()
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
    var map = region.computeTerrain();

    var canvas = document.createElement("canvas");
    var size = this.absoluteToScreenCoords({
        ax: coords.REGION_SIZE,
        ay: coords.REGION_SIZE + map.length
    });

    canvas.width = size.sx;
    canvas.height = size.sy;

    var sCanvasOffset = this.absoluteToScreenCoords({
        ax: 0,
        ay: map.length
    });

    var ctx = this.prepareContext(canvas);
    ctx.translate(0, sCanvasOffset.sy);

    for (var ry = 0; ry < coords.REGION_SIZE + 1; ++ry) {
      for (var rx = 0; rx < coords.REGION_SIZE + 1; ++rx) {
        map.forEach((levels, z) => {
          var terrain = levels[ry * (coords.REGION_SIZE + 1) + rx];

          // If we have a tile named all the terrain joined together, we use that
          // instead of compositing terrain.
          var combinedTileName = terrain.map((terrain) => terrain.name).join(",");
          if (hasOwnProp.call(Renderer.TILE_TEXTURE_MAPPINGS, combinedTileName)) {
            terrain = [{
                name: combinedTileName,
                mask: terrain[terrain.length - 1].mask
            }];
          }

          terrain.forEach((layer, layerIndex) => {
            var texture = this.resources.get(
                "tiles/" + Renderer.TILE_TEXTURE_MAPPINGS[layer.name]);

            Renderer.TILE_TEXTURE_COORDS[layer.mask].forEach((offset, index) => {
              if (offset === -1) {
                return;
              }

              // The offset selects which tile from the atlas to use. It assumes
              // the atlas is 4 half-tiles wide.
              var u = offset % 4;
              var v = Math.floor(offset / 4);

              // dx and dy indicate how many half-tiles in the half-tile needs
              // to be offset by. They are in clockwise order, starting from NW.
              var dx = [0, 1, 0, 1][index];
              var dy = [0, 0, 1, 1][index];

              var s = this.absoluteToScreenCoords({
                  ax: rx + dx / 2,
                  ay: ry + dy / 2 - z
              });

              var halfSize = Renderer.TILE_SIZE / 2;

              ctx.drawImage(texture,
                            u * halfSize, v * halfSize,
                            halfSize, halfSize,
                            s.sx - halfSize, s.sy - halfSize,
                            halfSize, halfSize);

              if (z > 0 && layerIndex === 0 && dy === 1) {
                // Draw z-wall.
                s = this.absoluteToScreenCoords({
                    ax: rx + dx / 2,
                    ay: ry + dy / 2 - z + 1
                });

                ctx.drawImage(texture,
                              u * halfSize, 6 * halfSize,
                              halfSize, halfSize,
                              s.sx - halfSize, s.sy - halfSize,
                              halfSize, halfSize);

                for (var k = 0; k < z - 1; ++k) {
                  s = this.absoluteToScreenCoords({
                      ax: rx + dx / 2,
                      ay: ry + dy / 2 - z + 1 + k + 0.5
                  });

                  ctx.drawImage(texture,
                                u * halfSize, 7 * halfSize,
                                halfSize, halfSize,
                                s.sx - halfSize, s.sy - halfSize,
                                halfSize, halfSize);

                  ctx.drawImage(texture,
                                u * halfSize, 8 * halfSize,
                                halfSize, halfSize,
                                s.sx - halfSize, s.sy,
                                halfSize, halfSize);
                }

                s = this.absoluteToScreenCoords({
                    ax: rx + dx / 2,
                    ay: ry + dy / 2 + 0.5
                });

                ctx.drawImage(texture,
                              u * halfSize, 9 * halfSize,
                              halfSize, halfSize,
                              s.sx - halfSize, s.sy - halfSize,
                              halfSize, halfSize);
              }
            });
          });
        });
      }
    }

    return canvas;
  }

  renderEntity(entity, ctx) {
    var region = entity.realm.getRegion(coords.absoluteToContainingRegion(
        entity.location));

    var rCoords = coords.absoluteToRelative(entity.location);
    var hOffset = region !== null
        ? region.heightmap.getCell(Math.round(rCoords.rx),
                                   Math.round(rCoords.ry))
        : 0;

    var sOffset = this.absoluteToScreenCoords({
        ax: entity.location.ax - this.aTopLeft.ax,
        ay: entity.location.ay - this.aTopLeft.ay - hOffset
    });

    ctx.save();
    ctx.translate(sOffset.sx, sOffset.sy);
    Renderer.ENTITIES[entity.type](this, entity, ctx);
    ctx.restore();
  }
}

Renderer.ENTITIES = {
    Actor: (renderer, entity, ctx) => {
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
              .render(renderer.resources, ctx, renderer.elapsed * entity.speed);
      })
    },

    Fixture: (renderer, entity, ctx) => {
      sprites[["Fixture", entity.fixtureType.name].join(".")]
          .render(renderer.resources, ctx, renderer.elapsed);
    },

    Drop: (renderer, entity, ctx) => {
      sprites[["Item", entity.item.type].join(".")]
          .render(renderer.resources, ctx, renderer.elapsed);
    },

    Player: (renderer, entity, ctx) => {
      Renderer.ENTITIES.Actor(renderer, entity, ctx);
      ctx.textAlign = "center";
      ctx.fillStyle = "black";
      ctx.fillText(entity.name, 17, -23);
      ctx.fillStyle = makeColorForString(entity.name);
      ctx.fillText(entity.name, 16, -24);
    },

    Building: (renderer, entity, ctx) => {
      ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
      ctx.strokeStyle = "rgba(255, 0, 0, 0.75)";

      var sSize = renderer.absoluteToScreenCoords({
          ax: entity.aWidth,
          ay: entity.aHeight
      });
      ctx.fillRect(0, 0, sSize.sx, sSize.sy);
      ctx.strokeRect(0, 0, sSize.sx, sSize.sy);
      ctx.fillStyle = "rgba(255, 0, 0, 0.75)";
      ctx.textAlign = "center";
      ctx.fillText("(id: " + entity.id + ")", sSize.sx / 2, sSize.sy / 2);
    }
};

Renderer.TILE_SIZE = 32;

Renderer.TILE_TEXTURE_MAPPINGS = {
    "grassland": "grass.png",
    "ocean": "water.png",
    "wall": "wall.png",
};

Renderer.TILE_TEXTURE_COORDS = {
  0x0: [ 0,  0,  0,  0], // none
  0x1: [-1, -1, 11, -1], // ne convex corner
  0x2: [-1, -1, -1,  8], // nw convex corner
  0x3: [-1, -1,  9, 10], // going n
  0x4: [-1, 20, -1, -1], // sw convex corner
  0x5: [-1, 20, 11, -1], // saddle ne->sw
  0x6: [-1, 12, -1, 16], // going w
  0x7: [-1, 16, 10,  2], // nw concave corner
  0x8: [23, -1, -1, -1], // se convex corner
  0x9: [15, -1, 19, -1], // going e
  0xa: [23, -1, -1,  8], // saddle nw->se
  0xb: [19, -1,  3,  9], // ne concave corner
  0xc: [21, 22, -1, -1], // going s
  0xd: [ 7, 21, 15, -1], // se concave corner
  0xe: [22,  6, -1, 12], // sw concave corner
  0xf: [13, 14, 17, 18], // all
};
