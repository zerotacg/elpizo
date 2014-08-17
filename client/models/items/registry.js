import {hasOwnProp} from "../../util/objects";
import {Item} from "../items";

export function makeItem(message) {
  if (!hasOwnProp.call(Item.REGISTRY, message.type)) {
    return new Item(message);
  }

  return new Item.REGISTRY[message.type](message);
}
