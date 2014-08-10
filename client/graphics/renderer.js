import {EventEmitter} from "events";

import {Directions} from "../models";
import {countingSort, repeat} from "../util/collections";
import {hasOwnProp, extend} from "../util/objects";
module coords from "../util/coords";

module sprites from "../assets/sprites";

class Sprite {
  constructor(def, speed) {
    this.def = def;
    this.speed = speed;
    this.frameIndex = 0;
  }

  render(resources, dt, ctx) {
    this.frameIndex += this.speed * this.def.speedFactor * dt;
    var frame = this.def.frames[Math.floor(this.frameIndex) %
                                this.def.frames.length];

    ctx.drawImage(resources.get("sprites/" + this.def.resourceName),
                  frame.sx, frame.sy,
                  this.def.sw, this.def.sh,
                  0, 0,
                  this.def.sw, this.def.sh);
  }
}

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

    this.aTopLeft = {
        ax: 0,
        ay: 0
    };

    this.resources = resources;
    this.realm = null;

    this.regionTerrainCache = {};
    this.entitySprites = {};
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

  prepareContext(ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
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

    this.emit("viewportChange", this.getAbsoluteWorldBounds());
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
        aRight: this.aTopLeft.ax + absoluteWorldBounds.ax,
        aBottom: this.aTopLeft.ay + absoluteWorldBounds.ay,
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
    this.entitySprites = {};
    this.regionTerrainCache = {};
  }

  render(dt) {
    if (this.realm === null) {
      return;
    }

    this.renderTerrain(this.realm);
    this.renderEntities(this.realm, dt);
  }

  renderTerrain(realm) {
    var screenViewportSize = this.getScreenViewportSize();

    var regionScreenSize =
        this.absoluteToScreenCoords({ax: coords.REGION_SIZE, ay: coords.REGION_SIZE});

    var ctx = this.terrainCanvas.getContext("2d");
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

  renderEntities(realm, dt) {
    var ctx = this.entityCanvas.getContext("2d");
    this.prepareContext(ctx);
    ctx.clearRect(0, 0, this.entityCanvas.width, this.entityCanvas.height);

    var aWorldBounds = this.getAbsoluteWorldBounds();

    var numBuckets = Math.ceil(aWorldBounds.aBottom - aWorldBounds.aTop);

    // We use counting sort to render entities as it is asymptotically better
    // than Array#sort (O(n) + constant factor of bucket allocation).
    var sortedEntities = countingSort(
        numBuckets, (entity) =>
            Math.floor(entity.location.ay - this.aTopLeft.ay),
        realm.getAllEntities().filter(
            (entity) => entity.location.ay >= aWorldBounds.aTop &&
                        entity.location.ay < aWorldBounds.aBottom));

    // Render in two passes - opaque items in the first pass, and xrayable in
    // the second.
    ctx.globalAlpha = 1.0;
    sortedEntities.forEach((entity) => {
      this.renderEntity(entity, ctx, dt, false);
    });

    ctx.globalAlpha = 0.25;
    sortedEntities.forEach((entity) => {
      this.renderEntity(entity, ctx, 0, true);
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

    var ctx = canvas.getContext("2d");
    this.prepareContext(ctx);

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

  getSpriteDirection(direction) {
    switch (direction) {
      case Directions.N: return "n";
      case Directions.W: return "w";
      case Directions.S: return "s";
      case Directions.E: return "e";
    }
  }

  getSpriteState(entity) {
    return entity.moving ? "walking" : "standing";
  }

  renderEntity(entity, ctx, dt, xraying) {
    var state = this.getSpriteState(entity);
    var direction = this.getSpriteDirection(entity.direction);

    var spriteDefs = Renderer.SPRITES[entity.type](entity).map((name) =>
        sprites[name][state][direction]);

    if (!hasOwnProp.call(this.entitySprites, entity.id) ||
        this.entitySprites[entity.id].length != spriteDefs.length) {
      this.entitySprites[entity.id] = repeat(spriteDefs.length, () =>
          new Sprite(null, entity.speed || 0));
    }

    spriteDefs.forEach((spriteDef, i) => {
      this.entitySprites[entity.id][i].def = spriteDef;
    });

    var sOffset = this.absoluteToScreenCoords({
        ax: entity.location.ax - this.aTopLeft.ax,
        ay: entity.location.ay - this.aTopLeft.ay
    });

    ctx.save();
    ctx.translate(sOffset.sx, sOffset.sy);
    this.entitySprites[entity.id].forEach((sprite) => {
      ctx.save();
      ctx.translate(-sprite.def.center.sx, -sprite.def.center.sy);
      if (!xraying || sprite.def.xrayable) {
        sprite.render(this.resources, dt, ctx);
      }
      ctx.restore();
    });
    ctx.restore();
  }
}

Renderer.SPRITES = {
    Actor: (actor) => {
      var names = [["Body", actor.gender, actor.body].join(".")];

      if (actor.facial) {
        names.push(["Facial", actor.gender, actor.facial].join("."));
      }

      if (actor.hair) {
        names.push(["Hair", actor.gender, actor.hair].join("."));
      }

      [].push.apply(names, actor.equipment.map((equipment) =>
          ["Equipment", actor.gender, equipment.type].join(".")));

      return names;
    },

    Fixture: (fixture) => {
      return [["Fixture", fixture.fixtureType.name].join(".")];
    },

    Drop: (drop) => {
      return [["Item", drop.item.name].join(".")];
    }
};

Renderer.SPRITES.Player = Renderer.SPRITES.Actor;

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
