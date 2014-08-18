import {EventEmitter} from "events";

import {EntityVisitor} from "../models/base";
import {Directions, getDirectionVector} from "../models/actors";
import {Drop} from "../models/base";
import {repeat} from "../util/collections";
import {makeColorForString} from "../util/colors";
import {Rectangle, Vector2} from "../util/geometry";
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

    parent.appendChild(this.el);

    this.terrainCanvas = this.createCanvas();
    this.terrainCanvas.style.zIndex = 0;
    this.el.appendChild(this.terrainCanvas);

    this.entityCanvas = this.createCanvas();
    this.entityCanvas.style.zIndex = 1;
    this.el.appendChild(this.entityCanvas);

    this.aTopLeft = new Vector2(0, 0);

    this.resources = resources;
    this.currentRealm = null;

    this.regionTerrainCache = {};
    this.elapsed = 0;

    window.onresize = debounce(() => {
      this.refit();
    }, 500);

    this.style = window.getComputedStyle(this.el);

    this.sBounds = new Rectangle(0, 0, 0, 0);
  }

  setDebug(debug) {
    this.debug = debug;
    this.regionTerrainCache = {};
  }

  center(aPosition) {
    var bounds = this.getAbsoluteViewportBounds();

    this.setAbsoluteTopLeft(new Vector2(
        aPosition.x - Math.round(bounds.width / 2),
        aPosition.y - Math.round(bounds.height / 2)));
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
    return location.scale(Renderer.TILE_SIZE);
  }

  screenToAbsoluteCoords(location) {
    return location.scale(1 / Renderer.TILE_SIZE);
  }

  setAbsoluteTopLeft(v) {
    var previous = this.getAbsoluteViewportBounds();
    this.aTopLeft = v;
    this.emit("viewportChange", this.getAbsoluteViewportBounds(), previous);
  }

  setScreenViewportSize(sw, sh) {
    var previous = this.getAbsoluteViewportBounds();

    this.el.style.width = sw + "px";
    this.el.style.height = sh + "px";

    var sBounds = this.el.getBoundingClientRect();
    this.sBounds = Rectangle.fromCorners(sBounds.left, sBounds.top,
                                         sBounds.right, sBounds.bottom);

    this.terrainCanvas.width = sw;
    this.terrainCanvas.height = sh;

    this.entityCanvas.width = sw;
    this.entityCanvas.height = sh;

    this.emit("viewportChange", this.getAbsoluteViewportBounds(), previous);
  }

  refit() {
    this.setScreenViewportSize(window.innerWidth, window.innerHeight);
    this.emit("refit", this.sBounds);
  }

  getAbsoluteViewportBounds() {
    var absoluteViewportSize = this.screenToAbsoluteCoords(new Vector2(
        this.sBounds.width, this.sBounds.height));

    return new Rectangle(this.aTopLeft.x, this.aTopLeft.y,
                         Math.ceil(absoluteViewportSize.x),
                         Math.ceil(absoluteViewportSize.y));
  }

  getRegionCacheBounds() {
    var viewport = this.getAbsoluteViewportBounds();

    var arTopLeft = coords.absoluteToContainingRegion(new Vector2(
        viewport.left - coords.REGION_SIZE,
        viewport.top - coords.REGION_SIZE));

    var arBottomRight = coords.absoluteToContainingRegion(new Vector2(
        viewport.getRight() + coords.REGION_SIZE,
        viewport.getBottom() + coords.REGION_SIZE));

    return Rectangle.fromCorners(arTopLeft.x, arTopLeft.y,
                                 arBottomRight.x + 1, arBottomRight.y + 1);
  }

  getRegionWorldBounds() {
    var aBounds = this.getAbsoluteViewportBounds();

    var arTopLeft = coords.absoluteToContainingRegion(
        new Vector2(aBounds.left, aBounds.top));

    var arBottomRight = coords.absoluteToContainingRegion(
        new Vector2(aBounds.getRight(), aBounds.getBottom()));

    return Rectangle.fromCorners(Math.floor(arTopLeft.x),
                                 Math.floor(arTopLeft.y),
                                 Math.ceil(arBottomRight.x) + 1,
                                 Math.ceil(arBottomRight.y) + 1);
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

    var ctx = this.prepareContext(this.terrainCanvas);
    ctx.clearRect(0, 0, this.terrainCanvas.width, this.terrainCanvas.height);

    var sOffset = this.absoluteToScreenCoords(this.aTopLeft.negate());

    // Only render the regions bounded by the viewport.
    for (var ary = arWorldBounds.top; ary < arWorldBounds.getBottom(); ++ary) {
      for (var arx = arWorldBounds.left; arx < arWorldBounds.getRight(); ++arx) {
        var arCoords = new Vector2(arx, ary);
        var sPosition = this.absoluteToScreenCoords(
            coords.regionToAbsolute(arCoords));

        var sLeft = Math.round(sOffset.x + sPosition.x);
        var sTop = Math.round(sOffset.y + sPosition.y);

        var key = [arCoords.x, arCoords.y].join(",");
        var region = realm.getRegionAt(arCoords);

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

    var sortedEntities = realm.getAllEntities()
        .sort((a, b) => {
            // Always sort drops below everything else.
            if (a instanceof Drop) {
              return -1;
            } else if (b instanceof Drop) {
              return 1;
            }

            return a.location.y - b.location.y;
        });

    sortedEntities.forEach((entity) => {
      this.renderEntity(entity, ctx);
    });
  }

  renderRegionTerrainAsBuffer(region) {
    var canvas = document.createElement("canvas");
    var size = this.absoluteToScreenCoords(new Vector2(
        coords.REGION_SIZE, coords.REGION_SIZE));

    canvas.width = size.x;
    canvas.height = size.y;

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
            var s = this.absoluteToScreenCoords(new Vector2(
                rx + (index % 2) / 2,
                ry + Math.floor(index / 2) / 2));

            ctx.save();
            ctx.translate(s.x, s.y);
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
          var x = rx * Renderer.TILE_SIZE;
          var y = ry * Renderer.TILE_SIZE;
          ctx.strokeRect(x, y,
                         Renderer.TILE_SIZE, Renderer.TILE_SIZE);
          ctx.fillText(rx + "," + ry, x + halfTileSize, y + halfTileSize);

          var passability = region.passabilities.getCell(rx, ry);
          for (var i = 0; i < 4; ++i) {
            var dv = getDirectionVector(i);
            var isPassable = region.isPassable(new Vector2(rx, ry), i);

            dv.x = -dv.x;
            dv.y = -dv.y;

            if (!isPassable) {
              ctx.fillRect(x + (dv.x + 1) * (halfTileSize - 4 - Math.abs(dv.y) * 6),
                           y + (dv.y + 1) * (halfTileSize - 4 - Math.abs(dv.x) * 6),
                           8 + Math.abs(dv.y) * 12,
                           8 + Math.abs(dv.x) * 12);
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
    var sOffset = this.absoluteToScreenCoords(
        entity.location.offset(this.aTopLeft.negate()));

    ctx.save();
    ctx.translate(sOffset.x, sOffset.y);
    entity.visit(new RendererVisitor(this, ctx));
    ctx.restore();
  }
}

class RendererVisitor extends EntityVisitor {
  constructor(renderer, ctx) {
    this.renderer = renderer;
    this.ctx = ctx;
  }

  visitEntity(entity) {
    if (this.renderer.debug) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0, 0, 255, 0.25)";
      this.ctx.strokeStyle = "rgba(0, 0, 255, 0.75)";

      var sOffset = this.renderer.absoluteToScreenCoords(new Vector2(
          entity.bbox.left, entity.bbox.top));
      var sSize = this.renderer.absoluteToScreenCoords(new Vector2(
          entity.bbox.width, entity.bbox.height));
      this.ctx.translate(sOffset.x, sOffset.y);
      this.ctx.fillRect(0, 0, sSize.x, sSize.y);
      this.ctx.strokeRect(0, 0, sSize.x, sSize.y);
      this.ctx.fillStyle = "rgba(0, 0, 255, 0.75)";
      this.ctx.font = "12px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("(id: " + entity.id + ")", sSize.x / 2, sSize.y / 2);
      this.ctx.restore();
    }
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
      sprites[["fixture", entity.fixtureType].join(".")]
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
    // TODO: actually draw the building with sprites.
    var sOffset = this.renderer.absoluteToScreenCoords(new Vector2(
        entity.bbox.left, entity.bbox.top));
    var sSize = this.renderer.absoluteToScreenCoords(new Vector2(
        entity.bbox.width, entity.bbox.height));

    this.ctx.fillStyle = "#eee6cb";
    this.ctx.fillRect(sOffset.x, sOffset.y, sSize.x, sSize.y);

    var sBottomOffset = this.renderer.absoluteToScreenCoords(new Vector2(
        entity.bbox.left, entity.bbox.getBottom() - 2));
    this.ctx.fillStyle = "#ddcf99";
    this.ctx.fillRect(sBottomOffset.x, sBottomOffset.y,
                      sSize.x, Renderer.TILE_SIZE * 2);

    var sDoorOffset = this.renderer.absoluteToScreenCoords(new Vector2(
        entity.bbox.left + entity.doorPosition, entity.bbox.getBottom() - 1.5));
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(sDoorOffset.x, sDoorOffset.y,
                      Renderer.TILE_SIZE, Renderer.TILE_SIZE * 1.5);
  }
}
Renderer.TILE_SIZE = 32;
