import {Game} from "./game";
import {loadImage} from "./util/resources";

var game = new Game(document.body);
game.loadFromManifest(window._manifest);

game.on("ready", () => {
  game.renderer.setScreenViewportSize(1024, 768);
  game.go();
});
