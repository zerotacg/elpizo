module bus from "../bus";

export var FETCH = "player-fetch";
export var UPDATE = "player-update";

export function fetch() {
  bus.handleViewAction({
    actionType: FETCH
  });
}

export function update(player) {
  bus.handleViewAction({
    actionType: UPDATE,
    player: player
  });
}
