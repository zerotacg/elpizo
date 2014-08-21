module items from "client/models/items";
module objects from "client/util/objects";

export function makeItem(message) {
  if (!objects.hasOwnProp.call(items.Item.REGISTRY, message.type)) {
    return new items.Item(message);
  }

  return new items.Item.REGISTRY[message.type](message);
}
