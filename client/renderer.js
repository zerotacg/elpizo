import {Region} from "./map";
import {countingSort} from "./util/collections";
import {hasOwnProp} from "./util/objects";
module coords from "./util/coords";

export class Renderer {
  constructor(resources) {
    this.terrainCanvas = document.createElement("canvas");
    this.entityCanvas = document.createElement("canvas");

    this.aTopLeft = {
        ax: 0,
        ay: 0
    };

    this.resources = resources;
    this.realm = null;
    this.regionTerrainCache = {};
  }

  absoluteToScreenCoords(ax, ay) {
    return {
        sx: ax * Renderer.TILE_SIZE,
        sy: ay * Renderer.TILE_SIZE
    };
  }

  screenToAbsoluteCoords(sx, sy) {
    return {
        ax: sx / Renderer.TILE_SIZE,
        ay: sy / Renderer.TILE_SIZE
    };
  }

  setScreenViewportSize(sw, sh) {
    this.terrainCanvas.width = sw;
    this.terrainCanvas.height = sh;

    this.entityCanvas.width = sw;
    this.entityCanvas.height = sh;
  }

  getScreenViewportSize() {
    return {
        sw: this.terrainCanvas.width,
        sh: this.terrainCanvas.height
    };
  }

  getAbsoluteWorldBounds() {
    var viewport = this.getScreenViewportSize();
    var absoluteWorldBounds = this.screenToAbsoluteCoords(
        viewport.sw, viewport.sh);

    return {
        aw: Math.ceil(absoluteWorldBounds.ax),
        ah: Math.ceil(absoluteWorldBounds.ay)
    };
  }

  getRegionWorldBounds() {
    var absoluteWorldBounds = this.getAbsoluteWorldBounds();
    return coords.absoluteToBoundingRegion(absoluteWorldBounds.aw,
                                           absoluteWorldBounds.ah);
  }

  setRealm(realm) {
    this.realm = realm;
  }

  render() {
    if (this.realm === null) {
      return;
    }

    this.renderTerrain(this.realm);
    this.renderEntities(this.realm);
  }

  renderTerrain(realm) {
    var screenViewportSize = this.getScreenViewportSize();

    var regionScreenSize =
        this.absoluteToScreenCoords(Region.SIZE, Region.SIZE);

    var ctx = this.terrainCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.terrainCanvas.width, this.terrainCanvas.height);

    var arTopLeft = coords.absoluteToContainingRegion(-this.aTopLeft.ax,
                                                      -this.aTopLeft.ay);

    var sOffset = this.absoluteToScreenCoords(
        this.aTopLeft.ax, this.aTopLeft.ay);

    var arWorldBounds = this.getRegionWorldBounds();

    var arRight = arTopLeft.arx + arWorldBounds.arw;
    var arBottom = arTopLeft.ary + arWorldBounds.arh;

    // Only render the chunks in bounded by the viewport.
    for (var ary = arTopLeft.ary; ary <= arBottom; ++ary) {
      for (var arx = arTopLeft.arx; arx <= arRight; ++arx) {
        var aPosition = coords.regionToAbsolute(arx, ary);
        var sPosition = this.absoluteToScreenCoords(aPosition.ax, aPosition.ay);

        // Additional screen-space culling.
        var sLeft = Math.round(sOffset.sx + sPosition.sx);
        var sTop = Math.round(sOffset.sy + sPosition.sy);

        if (sLeft + regionScreenSize.sx < 0 || sLeft >= screenViewportSize.sw ||
            sTop + regionScreenSize.sy < 0 || sTop >= screenViewportSize.sh) {
          continue;
        }

        var key = [arx, ary].join(",");
        var region = realm.getRegion(arx, ary);

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
    var ctx = this.entityCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.entityCanvas.width, this.entityCanvas.height);

    var aWorldBounds = this.getAbsoluteWorldBounds();

    // We use counting sort to render entities as it is asymptotically better
    // than Array#sort (O(n) + constant factor of bucket allocation).
    countingSort(
        aWorldBounds.ah,
        realm.getAllEntities().filter(
            (entity) => entity.ay >= this.aTopLeft.ay &&
                        entity.ay < this.aTopLeft.ay + aWorldBounds.ah),
        (entity) => entity.ay - this.aTopLeft)
        .forEach((entity) => {
      this.renderEntity(entity, ctx);
    })
  }

  renderRegionTerrainAsBuffer(region) {
    var canvas = document.createElement("canvas");
    var size = this.absoluteToScreenCoords(Region.SIZE, Region.SIZE);

    canvas.width = size.sx;
    canvas.height = size.sy;

    var ctx = canvas.getContext("2d");

    region.computeTerrain().forEach((terrain, i) => {
      var rx = i % Region.SIZE;
      var ry = Math.floor(i / Region.SIZE);

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

          var s = this.absoluteToScreenCoords(rx + dx / 2, ry + dy / 2);

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
    // No idea!
  }
}

Renderer.TILE_SIZE = 32;

Renderer.TILE_TEXTURE_MAPPINGS = {
    "grassland": "grass",
    "ocean": "water",
    "river": "water",
    "lakeshore": "water",
    "grassland,lakeshore": "water-grass",
    "lake": "water",
    "beach": "beach",
    "ocean,beach": "beach",
    "subtropical_desert": "sand"
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