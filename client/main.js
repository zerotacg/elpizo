module game from "client/game";

var g = new game.Game(document.body);
g.loadFromManifest(window._manifest);
// @ifdef DEBUG
window.g = g;
// @endif
