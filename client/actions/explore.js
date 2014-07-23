module bus from "../bus";

export var FETCH = "explore-fetch";
export var UPDATE = "explore-update";
export var ADD_CREATURE = "explore-add-creature";
export var REMOVE_CREATURE = "explore-remove-creature";

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

export function addCreature(creature) {
  bus.handleViewAction({
      actionType: ADD_CREATURE,
      creature: creature
  });
}

export function removeCreature(id) {
  bus.handleViewAction({
      actionType: REMOVE_CREATURE,
      id: id
  });
}
