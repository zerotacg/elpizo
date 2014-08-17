import {EventEmitter} from "events";

import {EntityVisitor} from "../models/base";
import {Directions, getDirectionVector} from "../models/actors";
import {Drop} from "../models/base";
import {repeat} from "../util/collections";
import {makeColorForString} from "../util/colors";
import {hasOwnProp, extend} from "../util/objects";
import {debounce} from "../util/functions";
module coords from "../util/coords";

module sprites from "../assets/sprites";

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

  setDebug(debug) {
    this.debug = debug;
    this.regionTerrainCache = {};
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
    ctx.font = this.style.fontSize + " " + this.style.fontFamily;
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

    // Only render the regions bounded by the viewport.
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
        ctx.save();
        ctx.translate(sLeft, sTop);
        ctx.drawImage(buffer, 0, 0);

        if (this.debug) {
          ctx.strokeStyle = "red";
          ctx.fillStyle = "red";
          ctx.strokeRect(0, 0, buffer.width, buffer.height);
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(key, buffer.width / 2, buffer.height / 2);
        }
        ctx.restore();
      }
    }
  }

  renderEntities(realm) {
    var ctx = this.prepareContext(this.entityCanvas);
    ctx.clearRect(0, 0, this.entityCanvas.width, this.entityCanvas.height);

    var aWorldBounds = this.getAbsoluteViewportBounds();

    var numBuckets = Math.ceil(aWorldBounds.aBottom - aWorldBounds.aTop);

    var sortedEntities = realm.getAllEntities()
        .sort((a, b) => {
            // Always sort drops below everything else.
            if (a instanceof Drop) {
              return -1;
            } else if (b instanceof Drop) {
              return 1;
            }

            return a.location.ay - b.location.ay;
        });

    sortedEntities.forEach((entity) => {
      this.renderEntity(entity, ctx);
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

    var halfTileSize = Renderer.TILE_SIZE / 2;

    var ctx = this.prepareContext(canvas);

    for (var ry = 0; ry < coords.REGION_SIZE; ++ry) {
      for (var rx = 0; rx < coords.REGION_SIZE; ++rx) {
        region.layers.forEach((layer) => {
          var spriteSet = sprites["tile." + layer.terrain.name];

          var tileNum = layer.tiles.getCell(rx, ry);
          if (tileNum < 0) {
            return;
          }

          spriteSet[tileNum].forEach((sprite, index) => {
            var s = this.absoluteToScreenCoords({
                ax: rx + (index % 2) / 2,
                ay: ry + Math.floor(index / 2) / 2
            });

            ctx.save();
            ctx.translate(s.sx, s.sy);
            sprite.render(this.resources, ctx, this.elapsed);
            ctx.restore();
          });
        });
      }
    }

    if (this.debug) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (var ry = 0; ry < coords.REGION_SIZE; ++ry) {
        for (var rx = 0; rx < coords.REGION_SIZE; ++rx) {
          var sx = rx * Renderer.TILE_SIZE;
          var sy = ry * Renderer.TILE_SIZE;
          ctx.strokeRect(sx, sy,
                         Renderer.TILE_SIZE, Renderer.TILE_SIZE);
          ctx.fillText(rx + "," + ry, sx + halfTileSize, sy + halfTileSize);

          var passability = region.passabilities.getCell(rx, ry);
          for (var i = 0; i < 4; ++i) {
            var dv = getDirectionVector(i);
            var isPassable = region.isPassable({rx: rx, ry: ry}, i);

            dv.ax = -dv.ax;
            dv.ay = -dv.ay;

            if (!isPassable) {
              ctx.fillRect(sx + (dv.ax + 1) * (halfTileSize - 4 - Math.abs(dv.ay) * 6),
                           sy + (dv.ay + 1) * (halfTileSize - 4 - Math.abs(dv.ax) * 6),
                           8 + Math.abs(dv.ay) * 12,
                           8 + Math.abs(dv.ax) * 12);
            }

            passability >>= 1;
          }
        }
      }

      ctx.restore();
    }

    return canvas;
  }

  renderEntity(entity, ctx) {
    var sOffset = this.absoluteToScreenCoords({
        ax: entity.location.ax - this.aTopLeft.ax,
        ay: entity.location.ay - this.aTopLeft.ay
    });

    ctx.save();
    ctx.translate(sOffset.sx, sOffset.sy);
    entity.visit(new RendererVisitor(this, ctx));
    ctx.restore();
  }
}

class RendererVisitor extends EntityVisitor {
  constructor(renderer, ctx) {
    this.renderer = renderer;
    this.ctx = ctx;
  }

  visitActor(entity) {
      var state = entity.moving ? "walking" : "standing";
      var direction = entity.direction == Directions.N ? "n" :
                      entity.direction == Directions.W ? "w" :
                      entity.direction == Directions.S ? "s" :
                      entity.direction == Directions.E ? "e" :
                      null;

      var names = [["body", entity.gender, entity.body].join(".")];

      if (entity.facial !== null) {
        names.push(["facial", entity.gender, entity.facial].join("."));
      }

      if (entity.hair !== null) {
        names.push(["hair", entity.gender, entity.hair].join("."));
      }

      [].push.apply(names, [
          entity.headItem,
          entity.torsoItem,
          entity.legsItem,
          entity.feetItem
      ]
          .filter((item) => item !== null)
          .map((item) => ["equipment", entity.gender, item.type].join(".")));

      names.forEach((name) => {
          sprites[name][state][direction]
              .render(this.renderer.resources, this.ctx,
                      this.renderer.elapsed * entity.getSpeed());
      })
  }

  visitFixture(entity) {
      sprites[["fixture", entity.fixtureType.name].join(".")]
          .render(this.renderer.resources, this.ctx, this.renderer.elapsed);
  }

  visitDrop(entity) {
    sprites[["item", entity.item.type].join(".")]
        .render(this.renderer.resources, this.ctx, this.renderer.elapsed);
  }

  visitPlayer(entity) {
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "black";
    this.ctx.fillText(entity.name, 17, -23);
    this.ctx.fillStyle = makeColorForString(entity.name);
    this.ctx.fillText(entity.name, 16, -24);
  }

  visitBuilding(entity) {
    // TODO: actually draw the building.

    if (this.renderer.debug) {
      this.ctx.fillStyle = "rgba(0, 255, 0, 0.25)";
      this.ctx.strokeStyle = "rgba(0, 255, 0, 0.75)";

      var sSize = this.renderer.absoluteToScreenCoords({
          ax: entity.aWidth,
          ay: entity.aHeight
      });
      this.ctx.fillRect(0, 0, sSize.sx, sSize.sy);
      this.ctx.strokeRect(0, 0, sSize.sx, sSize.sy);
      this.ctx.fillStyle = "rgba(0, 255, 0, 0.75)";
      this.ctx.font = "18px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("(id: " + entity.id + ")", sSize.sx / 2, sSize.sy / 2);
    }
  }
}
Renderer.TILE_SIZE = 32;
