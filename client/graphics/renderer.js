module chroma from "chroma-js";
module events from "events";

module sprites from "client/assets/sprites";
module entities from "client/models/entities";
module realm from "client/models/realm";
module bubble from "client/ui/overlay/bubble.react";
module colors from "client/util/colors";
module functions from "client/util/functions";
module geometry from "client/util/geometry";
module grid from "client/util/grid";
module objects from "client/util/objects";
module timing from "client/util/timing";

export class GraphicsRenderer extends events.EventEmitter {
  constructor(resources, parent) {
    super();

    // @ifdef DEBUG
    this.debug = false;
    // @endif

    this.el = document.createElement("div");
    this.el.classList.add("renderer");
    this.el.style.position = "relative";

    parent.appendChild(this.el);

    this.backBuffers = {};

    this.canvas = this.createCanvas();
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.el.appendChild(this.canvas);

    this.topLeft = new geometry.Vector2(0, 0);

    this.resources = resources;
    this.currentRealm = null;

    this.regionTerrainCache = {};
    this.elapsed = 0;
    this.lastRenderTime = 0;

    this.nextComponentKey = 0;

    window.onresize = functions.debounce(() => {
      this.refit();
    }, 500);

    this.style = window.getComputedStyle(this.el);

    this.sBounds = new geometry.Rectangle(0, 0, 0, 0);

    // We also hold React components here, which need to be parented onto the
    // overlay during the React tick phase.
    this.components = {};

    this.transitionTimer = new timing.CountdownTimer();
  }

  ensureBackBuffer(name) {
    if (!objects.hasOwnProp.call(this.backBuffers, name)) {
      var backbuffer = document.createElement("canvas");
      backbuffer.width = this.canvas.width;
      backbuffer.height = this.canvas.height;
      this.backBuffers[name] = backbuffer;
    }
    return this.backBuffers[name];
  }

  addComponent(id, comp) {
    delete this.components[id];

    objects.extend(comp.props, {
        renderer: this,
        key: this.nextComponentKey
    });

    ++this.nextComponentKey;
    this.components[id] = comp;
  }

  addChatBubble(entity, message) {
    this.addComponent(
        ["bubble", entity.id].join("."),
        bubble.Bubble({
            text: message,
            entity: entity,
            timer: new timing.CountdownTimer(3)
        }));
  }

  // @ifdef DEBUG
  setDebug(debug) {
    this.debug = debug;
    this.regionTerrainCache = {};
  }
  // @endif

  center(position) {
    var bounds = this.getViewportBounds();

    this.setTopLeft(new geometry.Vector2(
        position.x - Math.round(bounds.width / 2),
        position.y - Math.round(bounds.height / 2)));
  }

  prepareContext(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.font = this.style.fontSize + " " + this.style.fontFamily;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;
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
    return location.scale(GraphicsRenderer.TILE_SIZE);
  }

  fromScreenCoords(location) {
    return location.scale(1 / GraphicsRenderer.TILE_SIZE);
  }

  setTopLeft(v) {
    var previous = this.getViewportBounds();
    this.topLeft = v;
    this.emit("viewportChange");
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

    Object.keys(this.backBuffers).forEach((k) => {
      var backbuffer = this.backBuffers[k];
      backbuffer.width = sw;
      backbuffer.height = sh;
    })

    this.canvas.width = sw;
    this.canvas.height = sh;

    this.emit("viewportChange");
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

  render(realm, me, dt) {
    this.transitionTimer.update(dt);

    var composite = this.ensureBackBuffer("composite");
    var retain = this.ensureBackBuffer("retain");

    if (realm !== this.currentRealm) {
      // Copy the last composite and retain it.
      var retainCtx = this.prepareContext(retain);
      retainCtx.clearRect(0, 0, retain.width, retain.height);
      retainCtx.drawImage(composite, 0, 0);
      this.transitionTimer.reset(0.25);
    }

    this.elapsed += dt;
    this.renderTerrain(realm, me);
    this.renderEntities(realm, me);
    this.updateComponents(dt);

    var albedo = this.ensureBackBuffer("albedo");
    var albedoCtx = this.prepareContext(albedo);

    var illumination = this.ensureBackBuffer("illumination");
    var illuminationCtx = this.prepareContext(illumination);
    illuminationCtx.globalCompositeOperation = "lighter";

    albedoCtx.save();
    albedoCtx.clearRect(0, 0, composite.width, composite.height);
    albedoCtx.drawImage(this.ensureBackBuffer("terrain"), 0, 0);
    albedoCtx.drawImage(this.ensureBackBuffer("entity"), 0, 0);
    albedoCtx.globalAlpha = 0.25;
    albedoCtx.drawImage(this.ensureBackBuffer("xray"), 0, 0);
    albedoCtx.globalAlpha = 1.0;
    albedoCtx.restore();

    var compositeCtx = this.prepareContext(composite);
    compositeCtx.save();
    compositeCtx.clearRect(0, 0, composite.width, composite.height);
    compositeCtx.drawImage(albedo, 0, 0);
    compositeCtx.globalCompositeOperation = "multiply";
    compositeCtx.drawImage(illumination, 0, 0);
    compositeCtx.restore();

    var ctx = this.prepareContext(this.canvas);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.globalAlpha = 1 - this.transitionTimer.getElapsedRatio();
    ctx.drawImage(retain, 0, 0);

    ctx.globalAlpha = this.transitionTimer.getElapsedRatio();
    ctx.drawImage(composite, 0, 0);

    this.lastRenderTime = this.lastRenderTime * 0.9 + dt * 0.1;
  }

  updateComponents(dt) {
    var components = this.components;
    this.components = {};

    Object.keys(components).forEach((k) => {
      var comp = components[k];

      var timer = comp.props.timer;
      if (timer === null) {
        return;
      }

      timer.update(dt);
      if (!timer.isStopped()) {
        this.components[k] = comp;
      }
    });
  }

  renderTerrain(r, me) {
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

    var terrainCanvas = this.ensureBackBuffer("terrain");
    var ctx = this.prepareContext(terrainCanvas);
    ctx.clearRect(0, 0, terrainCanvas.width, terrainCanvas.height);

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

        // @ifdef DEBUG
        if (this.debug) {
          ctx.strokeStyle = "red";
          ctx.fillStyle = "red";
          ctx.strokeRect(0, 0, buffer.width, buffer.height);
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(key, buffer.width / 2, buffer.height / 2);
        }
        // @endif

        ctx.restore();
      }
    }
  }

  renderEntities(realm, me) {
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

    var entityCanvas = this.ensureBackBuffer("entity");
    var ctx = this.prepareContext(entityCanvas);
    ctx.save();
    ctx.clearRect(0, 0, entityCanvas.width, entityCanvas.height);

    var xrayCanvas = this.ensureBackBuffer("xray");
    var xrayCtx = this.prepareContext(xrayCanvas);
    xrayCtx.save();
    xrayCtx.clearRect(0, 0, xrayCanvas.width, xrayCanvas.height);

    sortedEntities.forEach((entity) => {
      this.renderEntity(entity, me, ctx);
      this.renderEntity(entity, me, xrayCtx, {xray: true});
    });

    ctx.restore();
    xrayCtx.restore();
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

    var halfTileSize = GraphicsRenderer.TILE_SIZE / 2;

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

    // @ifdef DEBUG
    if (this.debug) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (var ry = 0; ry < realm.Region.SIZE; ++ry) {
        for (var rx = 0; rx < realm.Region.SIZE; ++rx) {
          var x = rx * GraphicsRenderer.TILE_SIZE;
          var y = ry * GraphicsRenderer.TILE_SIZE;
          ctx.strokeRect(x, y,
                         GraphicsRenderer.TILE_SIZE,
                         GraphicsRenderer.TILE_SIZE);
          ctx.fillText(rx + "," + ry, x + halfTileSize, y + halfTileSize);

          // TODO: fix passability masks
          for (var i = 0; i < 4; ++i) {
            var dv = entities.getDirectionVector(i);

            var dummy = Object.create(entities.Player.prototype);
            dummy.bbox = new geometry.Rectangle(0, 0, 1, 1);
            dummy.location = (new geometry.Rectangle(rx, ry, 1, 1))
                .offset(region.location)
                .offset(entities.getDirectionVector(i).negate());
            dummy.direction = i;
            var isPassable = region.isTerrainPassableBy(dummy);

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
    // @endif

    return canvas;
  }

  renderEntity(entity, me, ctx, options) {
    var sOffset = this.toScreenCoords(
        entity.location.offset(this.topLeft.negate()));

    ctx.save();
    ctx.translate(sOffset.x, sOffset.y);
    entity.accept(new GraphicsRendererVisitor(this, me, ctx, options));
    ctx.restore();
  }
}

function drawAutotileGrid(renderer, grid, autotile, ctx) {
  for (var y = 0; y < grid.height; ++y) {
    for (var x = 0; x < grid.width; ++x) {
      var filled = grid.getCell(x, y);

      if (!filled) {
        continue;
      }

      var neighborN =  grid.getCell(x,     y - 1);
      var neighborNE = grid.getCell(x + 1, y - 1);
      var neighborE =  grid.getCell(x + 1, y);
      var neighborSE = grid.getCell(x + 1, y + 1);
      var neighborS =  grid.getCell(x,     y + 1);
      var neighborSW = grid.getCell(x - 1, y + 1);
      var neighborW =  grid.getCell(x - 1, y);
      var neighborNW = grid.getCell(x - 1, y - 1);

      var autotileIndex;

      // Compute the autotile to use.
      if (!neighborN && !neighborE && !neighborS && !neighborW) {
        // NESW walls (46).
        autotileIndex = 46;
      } else if (!neighborN + !neighborE + !neighborS + !neighborW === 3) {
        // 3 walls (42, 43, 44, 45).
        autotileIndex = 42 + [neighborS, neighborE, neighborN, neighborW]
            .indexOf(true);
      } else if (!neighborN && !neighborS) {
        // NS wall (33).
        autotileIndex = 33;
      } else if (!neighborE && !neighborW) {
        // WE wall (32).
        autotileIndex = 32;
      } else if (!neighborN && !neighborE) {
        // NE walls (36, 37).
        autotileIndex = 36 + !neighborSW;
      } else if (!neighborE && !neighborS) {
        // ES walls (38, 39).
        autotileIndex = 38 + !neighborNW;
      } else if (!neighborS && !neighborW) {
        // SW walls (40, 41).
        autotileIndex = 40 + !neighborNE;
      } else if (!neighborW && !neighborN) {
        // WN walls (34, 35).
        autotileIndex = 34 + !neighborSE;
      } else if (!neighborN) {
        // N wall (20, 21, 22, 23).
        autotileIndex = 20 + ((!neighborSW << 1) | (!neighborSE << 0));
      } else if (!neighborE) {
        // E wall (24, 25, 26, 27).
        autotileIndex = 24 + ((!neighborNW << 1) | (!neighborSW << 0));
      } else if (!neighborS) {
        // S wall (28, 29, 30, 31).
        autotileIndex = 28 + ((!neighborNW << 1) | (!neighborNE << 0));
      } else if (!neighborW) {
        // W wall (16, 17, 18, 19).
        autotileIndex = 16 + ((!neighborSE << 1) | (!neighborNE << 0));
      } else {
        // Corner walls (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15).
        autotileIndex = (!neighborSW << 3) | (!neighborSE << 2) |
                        (!neighborNE << 1) | (!neighborNW << 0);
      }

      var sOffset = renderer.toScreenCoords(new geometry.Vector2(x, y));
      ctx.save();
      ctx.translate(sOffset.x, sOffset.y);
      renderer.renderAutotile(autotile[autotileIndex], ctx);
      ctx.restore();
    }
  }
}

function drawAutotileRectangle(renderer, rect, autotile, ctx) {
  var g = new grid.Grid(rect.width, rect.height);
  g.fill(true);

  var sOffset = renderer.toScreenCoords(
      new geometry.Vector2(rect.left, rect.top));

  ctx.save();
  ctx.translate(sOffset.x, sOffset.y);
  drawAutotileGrid(renderer, g, autotile, ctx);
  ctx.restore();
}

export function getActorSpriteNames(actor) {
  var names = [["body", actor.gender, actor.body].join(".")];

  /*if (actor.facial !== null) {
    names.push(["facial", actor.gender, actor.facial].join("."));
  }

  if (actor.hair !== null) {
    names.push(["hair", actor.gender, actor.hair].join("."));
  }

  [].push.apply(names, [
      actor.headItem,
      actor.torsoItem,
      actor.legsItem,
      actor.feetItem,
      actor.weapon
  ]
      .filter((item) => item !== null)
      .map((item) => ["equipment", actor.gender, item.type].join(".")));*/

  return names;
}


class GraphicsRendererVisitor extends entities.EntityVisitor {
  constructor(renderer, me, ctx, options) {
    this.renderer = renderer;
    this.me = me;
    this.ctx = ctx;
    this.options = options || {};
  }

  visitEntity(entity) {
    // @ifdef DEBUG
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
    // @endif

    super.visitEntity(entity);
  }

  visitActor(entity) {
    var state = entity.isMoving ? "walking" :
                "standing";

    var elapsed = this.renderer.elapsed * entity.getSpeed();

    var direction = entity.direction == entities.Directions.N ? "n" :
                    entity.direction == entities.Directions.W ? "w" :
                    entity.direction == entities.Directions.S ? "s" :
                    entity.direction == entities.Directions.E ? "e" :
                    null;

    getActorSpriteNames(entity).forEach((name) => {
        sprites[name][state][direction]
            .render(this.renderer.resources, this.ctx, elapsed);
    })

    // Render the name card.
    if (!this.options.xray) {
      this.ctx.save();
      this.ctx.translate(16, -entity.getHeight() * 32 + 16);

      var baseWidth = this.ctx.measureText(entity.name).width;
      var width = baseWidth + 8;

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.fillRect(-width / 2, 0, width, 20);

      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      var textColor = chroma(colors.makeColorForString(entity.name))
          .darken(10).hex();
      this.ctx.fillStyle = textColor;
      this.ctx.fillText(entity.name, 0, 10);
      this.ctx.restore();
    }

    super.visitActor(entity);
  }

  visitFixture(entity) {
    if (this.options.xray) {
      return;
    }

    sprites[["fixture", entity.fixtureType].join(".")]
        .render(this.renderer.resources, this.ctx, this.renderer.elapsed);

    super.visitFixture(entity);
  }

  visitDrop(entity) {
    if (this.options.xray) {
      return;
    }

    sprites[["item", entity.item.type].join(".")]
        .render(this.renderer.resources, this.ctx, this.renderer.elapsed);

    super.visitDrop(entity);
  }

  visitPlayer(entity) {
    super.visitPlayer(entity);
  }

  visitBuilding(entity) {
    if (this.options.xray) {
      return;
    }

    if (this.me.getBounds().intersects(entity.getBounds())) {
      return;
    }

    this.ctx.save();
    drawAutotileRectangle(this.renderer,
                          new geometry.Rectangle(entity.bbox.left,
                                                 entity.bbox.getBottom() - 2,
                                                 entity.bbox.width,
                                                 2),
                          sprites["building.wall"],
                          this.ctx);

    var halfHeight = this.renderer.toScreenCoords(
        new geometry.Vector2(0, 1)).y / 2;

    if (entity.doorLocation === 2) {
      var doorOffset = this.renderer.toScreenCoords(new geometry.Vector2(1, 2));

      this.ctx.fillStyle = "black";
      this.ctx.fillRect(doorOffset.x, doorOffset.y,
                        GraphicsRenderer.TILE_SIZE, GraphicsRenderer.TILE_SIZE);
    }

    this.ctx.translate(0, -halfHeight);
    sprites["building.red_roof_1"].render(this.renderer.resources, this.ctx,
                                          this.renderer.elapsed);
    this.ctx.restore();

    super.visitBuilding(entity);
  }
}
GraphicsRenderer.TILE_SIZE = 32;
