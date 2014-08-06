import {Game} from "./game";
import {loadImage} from "./util/resources";

var game = new Game(document.body);
game.loadResources({
    "sprites.tree.small.oak":
        loadImage("static/img/tree/small/oak.png"),

    "sprites.body.male.light":
        loadImage("static/img/body/male/light.png"),

    "sprites.facial.beard.brown":
        loadImage("static/img/facial/beard/brown.png"),

    "sprites.hair.messy1.brown":
        loadImage("static/img/hair/messy1/brown.png"),

    "sprites.torso.shirt.white_longsleeve_male":
        loadImage("static/img/torso/shirt/white_longsleeve_male.png"),

    "sprites.legs.pants.teal_pants_male":
        loadImage("static/img/legs/pants/teal_pants_male.png"),

    "sprites.feet.shoes.brown_shoes_male":
        loadImage("static/img/feet/shoes/brown_shoes_male.png"),

    "tiles.grass":
        loadImage("static/img/tiles/grass.png"),

    "tiles.water":
        loadImage("static/img/tiles/water.png")
});
game.renderer.setScreenViewportSize(1024, 768);

game.on("ready", () => {
  game.go();
});
