module events from "events";

module sprites from "client/assets/sprites";
module entities from "client/models/entities";
module realm from "client/models/realm";
module colors from "client/util/colors";
module functions from "client/util/functions";
module geometry from "client/util/geometry";
module objects from "client/util/objects";
module timing from "client/util/timing";

export class Renderer extends events.EventEmitter {
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

    this.topLeft = new geometry.Vector2(0, 0);

    this.resources = resources;
    this.currentRealm = null;

    this.regionTerrainCache = {};
    this.elapsed = 0;
    this.lastRenderTime = 0;

    this._nextComponentId = 0;

    window.onresize = functions.debounce(() => {
      this.refit();
    }, 500);

    this.style = window.getComputedStyle(this.el);

    this.sBounds = new geometry.Rectangle(0, 0, 0, 0);

    // We also hold React components here, which need to be parented onto the
    // overlay during the React tick phase.
    this.components = [];
  }

  addTimedComponent(comp, timer) {
    comp.props.timer = timer;
    comp.props.renderer = this;

    comp.props.key = this._nextComponentId;
    ++this._nextComponentId;
    this.components.push(comp);
  }

  setDebug(debug) {
    this.debug = debug;
    this.regionTerrainCache = {};
  }

  center(position) {
    var bounds = this.getViewportBounds();

    this.setTopLeft(new geometry.Vector2(
        position.x - Math.round(bounds.width / 2),
        position.y - Math.round(bounds.height / 2)));
  }

  prepareContext(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.font = this.style.fontSize + " " + this.style.fontFamily;
    return ctx;
  }

  createCanvas() {
    var canvas = document.createElement("canvas");
    objects.extend(canvas.style, {
        position: "absolute",
        left: "0px",
        top: "0px",
        width: "100%",
        height: "100%"
    });
    return canvas;
  }

  toScreenCoords(location) {
    return location.scale(Renderer.TILE_SIZE);
  }

  fromScreenCoords(location) {
    return location.scale(1 / Renderer.TILE_SIZE);
  }

  setTopLeft(v) {
    var previous = this.getViewportBounds();
    this.topLeft = v;
    this.emit("viewportChange", this.getViewportBounds(), previous);
  }

  setScreenViewportSize(sw, sh) {
    var previous = this.getViewportBounds();

    this.el.style.width = sw + "px";
    this.el.style.height = sh + "px";

    var sBounds = this.el.getBoundingClientRect();
    this.sBounds = geometry.Rectangle.fromCorners(sBounds.left,
                                                  sBounds.top,
                                                  sBounds.right,
                                                  sBounds.bottom);

    this.terrainCanvas.width = sw;
    this.terrainCanvas.height = sh;

    this.entityCanvas.width = sw;
    this.entityCanvas.height = sh;

    this.emit("viewportChange", this.getViewportBounds(), previous);
  }

  refit() {
    this.setScreenViewportSize(window.innerWidth, window.innerHeight);
    this.emit("refit", this.sBounds);
  }

  getViewportBounds() {
    var size = this.fromScreenCoords(new geometry.Vector2(
        this.sBounds.width, this.sBounds.height));

    return new geometry.Rectangle(this.topLeft.x, this.topLeft.y,
                                  Math.ceil(size.x), Math.ceil(size.y));
  }

  getCacheBounds() {
    var viewport = this.getViewportBounds();

    return geometry.Rectangle.fromCorners(
        realm.Region.floor(viewport.left - realm.Region.SIZE),
        realm.Region.floor(viewport.top - realm.Region.SIZE),
        realm.Region.ceil(viewport.getRight() + realm.Region.SIZE),
        realm.Region.ceil(viewport.getBottom() + realm.Region.SIZE));
  }

  render(realm, dt) {
    this.elapsed += dt;
    this.renderTerrain(realm);
    this.renderEntities(realm);
    this.updateComponents(dt);

    this.lastRenderTime = this.lastRenderTime * 0.9 + dt * 0.1;
  }

  updateComponents(dt) {
    var components = this.components;
    this.components = [];

    components.forEach((comp) => {
      var timer = comp.props.timer;
      timer.update(dt);
      if (!timer.isStopped()) {
        this.components.push(comp);
      }
    });
  }

  renderTerrain(r) {
    var viewport = this.getViewportBounds();

    if (r !== this.currentRealm) {
      this.regionTerrainCache = {};
      this.currentRealm = r;
    } else {
      // Evict parts of the terrain cache to keep it synchronized with realm
      // regions.
      Object.keys(this.regionTerrainCache).forEach((k) => {
        if (!r.regions[k]) {
          delete this.regionTerrainCache[k];
        }
      });
    }

    var ctx = this.prepareContext(this.terrainCanvas);
    ctx.clearRect(0, 0, this.terrainCanvas.width, this.terrainCanvas.height);

    var sOffset = this.toScreenCoords(this.topLeft.negate());

    // Only render the regions bounded by the viewport.
    for (var y = realm.Region.floor(viewport.top);
         y < realm.Region.ceil(viewport.getBottom());
         y += realm.Region.SIZE) {
      for (var x = realm.Region.floor(viewport.left);
           x < realm.Region.ceil(viewport.getRight());
           x += realm.Region.SIZE) {
        var sPosition = this.toScreenCoords(new geometry.Vector2(x, y));
        var sLeft = Math.round(sOffset.x + sPosition.x);
        var sTop = Math.round(sOffset.y + sPosition.y);

        var key = [x, y].join(",");
        var region = r.getRegionAt(new geometry.Vector2(x, y));

        if (region === null) {
          continue;
        }

        // If this region hasn't been rendered yet, then we render it and add it
        // to the cache.
        if (!objects.hasOwnProp.call(this.regionTerrainCache, key)) {
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

    var sortedEntities = realm.getAllEntities()
        .sort((a, b) => {
            // Always sort drops below everything else.
            if (a instanceof entities.Drop) {
              return -1;
            } else if (b instanceof entities.Drop) {
              return 1;
            }

            return a.location.y - b.location.y;
        });

    sortedEntities.forEach((entity) => {
      this.renderEntity(entity, ctx);
    });
  }

  renderAutotile(autotile, ctx) {
    autotile.forEach((sprite, index) => {
      var s = this.toScreenCoords(new geometry.Vector2(
          (index % 2) / 2,
          Math.floor(index / 2) / 2));

      ctx.save();
      ctx.translate(s.x, s.y);
      sprite.render(this.resources, ctx, this.elapsed);
      ctx.restore();
    });
  }

  renderRegionTerrainAsBuffer(region) {
    var canvas = document.createElement("canvas");
    var size = this.toScreenCoords(new geometry.Vector2(
        realm.Region.SIZE, realm.Region.SIZE));

    canvas.width = size.x;
    canvas.height = size.y;

    var halfTileSize = Renderer.TILE_SIZE / 2;

    var ctx = this.prepareContext(canvas);

    for (var ry = 0; ry < realm.Region.SIZE; ++ry) {
      for (var rx = 0; rx < realm.Region.SIZE; ++rx) {
        region.layers.forEach((layer) => {
          var spriteSet = sprites[["tile", layer.terrain].join(".")];

          var tileNum = layer.tiles.getCell(rx, ry);
          if (tileNum < 0) {
            return;
          }

          var sOffset = this.toScreenCoords(new geometry.Vector2(rx, ry));
          ctx.save();
          ctx.translate(sOffset.x, sOffset.y);
          this.renderAutotile(spriteSet[tileNum], ctx);
          ctx.restore();
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

      for (var ry = 0; ry < realm.Region.SIZE; ++ry) {
        for (var rx = 0; rx < realm.Region.SIZE; ++rx) {
          var x = rx * Renderer.TILE_SIZE;
          var y = ry * Renderer.TILE_SIZE;
          ctx.strokeRect(x, y,
                         Renderer.TILE_SIZE, Renderer.TILE_SIZE);
          ctx.fillText(rx + "," + ry, x + halfTileSize, y + halfTileSize);

          for (var i = 0; i < 4; ++i) {
            var dv = entities.getDirectionVector(i);
            var isPassable = region.isPassable(
                (new geometry.Rectangle(rx, ry, 1, 1)).offset(region.location),
                i);

            dv.x = -dv.x;
            dv.y = -dv.y;

            if (!isPassable) {
              ctx.fillRect(x + (dv.x + 1) * (halfTileSize - 4 - Math.abs(dv.y) * 6),
                           y + (dv.y + 1) * (halfTileSize - 4 - Math.abs(dv.x) * 6),
                           8 + Math.abs(dv.y) * 12,
                           8 + Math.abs(dv.x) * 12);
            }
          }
        }
      }

      ctx.restore();
    }

    return canvas;
  }

  renderEntity(entity, ctx) {
    var sOffset = this.toScreenCoords(
        entity.location.offset(this.topLeft.negate()));

    ctx.save();
    ctx.translate(sOffset.x, sOffset.y);
    entity.accept(new RendererVisitor(this, ctx));
    ctx.restore();
  }
}

function drawAutotileRectangle(renderer, rect, autotile, ctx) {
  var bottom = rect.getBottom();
  var right = rect.getRight();

  for (var y = rect.top; y < bottom; ++y) {
    for (var x = rect.left; x < right; ++x) {
      var sOffset = renderer.toScreenCoords(new geometry.Vector2(x, y));

      var autotileIndex =
          x === rect.left && y === rect.top     ? 34 :
          x === right - 1 && y === rect.top     ? 36 :
          x === right - 1 && y === bottom - 1   ? 38 :
          x === rect.left && y === bottom - 1   ? 40 :
          x === rect.left                       ? 16 :
          x === right - 1                       ? 24 :
          y === rect.top                        ? 20 :
          y === bottom - 1                      ? 28 :
          0;

      ctx.save();
      ctx.translate(sOffset.x, sOffset.y);
      renderer.renderAutotile(autotile[autotileIndex], ctx);
      ctx.restore();
    }
  }
}

class RendererVisitor extends entities.EntityVisitor {
  constructor(renderer, ctx) {
    this.renderer = renderer;
    this.ctx = ctx;
  }

  visitEntity(entity) {
    super.visitEntity(entity);

    if (this.renderer.debug) {
      this.ctx.save();
      this.ctx.fillStyle = "rgba(0, 0, 255, 0.25)";
      this.ctx.strokeStyle = "rgba(0, 0, 255, 0.75)";

      var sOffset = this.renderer.toScreenCoords(new geometry.Vector2(
          entity.bbox.left, entity.bbox.top));
      var sSize = this.renderer.toScreenCoords(new geometry.Vector2(
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
    super.visitActor(entity);

    var attackTimer = entity.getTimer("attack");

    var attacking = !attackTimer.isStopped();

    var state = entity.isMoving ? "walking" :
                attacking ? "slashing" :
                "standing";

    var elapsed;
    if (attacking) {
      elapsed = attackTimer.getElapsed() * entity.getAttackCooldown();
    } else {
      elapsed = this.renderer.elapsed * entity.getSpeed();
    }

    var direction = entity.direction == entities.Directions.N ? "n" :
                    entity.direction == entities.Directions.W ? "w" :
                    entity.direction == entities.Directions.S ? "s" :
                    entity.direction == entities.Directions.E ? "e" :
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
        entity.feetItem,
        entity.weapon
    ]
        .filter((item) => item !== null)
        .map((item) => ["equipment", entity.gender, item.type].join(".")));

    names.forEach((name) => {
        sprites[name][state][direction]
            .render(this.renderer.resources, this.ctx, elapsed);
    })

    // Render the name card.
    this.ctx.translate(16, 32);

    var baseWidth = this.ctx.measureText(entity.name).width;
    var width = baseWidth + 8;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(-width / 2, 0, width, 20);

    this.ctx.fillStyle = colors.makeColorForString(entity.name);
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(entity.name, 0, 0);
  }

  visitFixture(entity) {
    super.visitFixture(entity);

    sprites[["fixture", entity.fixtureType].join(".")]
        .render(this.renderer.resources, this.ctx, this.renderer.elapsed);
  }

  visitDrop(entity) {
    super.visitDrop(entity);

    sprites[["item", entity.item.type].join(".")]
        .render(this.renderer.resources, this.ctx, this.renderer.elapsed);
  }

  visitPlayer(entity) {
    super.visitPlayer(entity);
  }

  visitBuilding(entity) {
    super.visitBuilding(entity);

    drawAutotileRectangle(this.renderer,
                          new geometry.Rectangle(entity.bbox.left,
                                                 entity.bbox.top,
                                                 entity.bbox.width,
                                                 entity.bbox.height - 2),
                          sprites["building.roof"],
                          this.ctx);

    drawAutotileRectangle(this.renderer,
                          new geometry.Rectangle(entity.bbox.left,
                                                 entity.bbox.getBottom() - 2,
                                                 entity.bbox.width,
                                                 2),
                          sprites["building.wall"],
                          this.ctx);
  }
}
Renderer.TILE_SIZE = 32;
