module bus from "../bus";

export var FETCH = "explore-fetch";
export var UPDATE = "explore-update";

export function fetch() {
  bus.handleViewAction({
    actionType: FETCH
  });
}

export function update(explore) {
  bus.handleViewAction({
    actionType: UPDATE,
    explore: explore
  });
}
