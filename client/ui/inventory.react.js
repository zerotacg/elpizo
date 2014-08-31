/** @jsx React.DOM */

module React from "react";

module sprites from "client/assets/sprites";
module entities from "client/models/entities";
module items from "client/models/items";
module equipment from "client/models/items/equipment";
module packets from "client/protos/packets";

var Item = React.createClass({
  render: function () {
    var displayName = "(no item)";
    var background = null;
    var onClick = () => { };

    if (this.props.item !== null) {
      displayName = this.props.item.getIndefiniteName();

      var sprite = sprites[["item", this.props.item.type].join(".")];
      var img = sprite.getResource(this.props.resources);
      var firstFrame = sprite.frames[0];

      background = "url(\"" + img.src + "\") " +
                   -firstFrame.x + "px " +
                   -firstFrame.y + "px " +
                   "no-repeat";

      onClick = this.props.onClick;
    }

    return <a className="item" onClick={onClick} title={displayName}>
      <div className="sprite" style={{background: background}} />
      <div className="title">{displayName}</div>
    </a>;
  }
})

class ItemMenuVisitor {
  constructor(comp, i) {
    this.comp = comp;
    this.i = i;
    this.items = [];
  }

  visitItem(item) {
    this.items.push(<li key="drop">
      <a onClick={this.comp.drop.bind(this.comp, this.i)}>Drop</a>
    </li>);
  }

  visitEquipment(item) {
    this.items.push(<li key="equip">
      <a onClick={this.comp.equip.bind(this.comp, this.i)}>Equip</a>
    </li>);

    this.visitItem(item);
  }
}

export var Inventory = React.createClass({
  drop: function (i) {
    this.props.game.protocol.send(new packets.DiscardPacket({
        inventoryIndex: i
    }));
  },

  dequip: function (slot) {
    var item = this.props.game.me[slot];
    this.props.game.me[slot] = null;

    this.props.game.protocol.send(new packets.ModifyEquipmentPacket({
        slot: item.getSlot(),
        inventoryIndex: null
    }));
  },

  equip: function (i) {
    var item = this.props.game.me.inventory[i];

    var slot = equipment.Equipment.SLOT_NAMES[item.getSlot()]
    if (this.props.game.me[slot] !== null) {
      // Make sure we dequip the item in the slot first.
      this.props.game.protocol.send(new packets.ModifyEquipmentPacket({
          slot: item.getSlot(),
          inventoryIndex: null
      }));
    }

    this.props.game.protocol.send(new packets.ModifyEquipmentPacket({
        slot: item.getSlot(),
        inventoryIndex: i
    }));
  },

  render: function () {
    var me = this.props.game.me;
    if (me === null) {
      return null;
    }

    var resources = this.props.game.resources;

    var items = me.inventory.map((item, i) => {
      var visitor = new ItemMenuVisitor(this, i);
      item.accept(visitor);

      return <li key={i}>
        <Item resources={resources} item={item} />
        <ul className="menu">{visitor.items}</ul>
      </li>
    }).reverse();

    return <div className={"inventory"+ (this.props.show ? "" : " hidden")}>
      <div className="wrapper">
        <div className="bag">
          <div className="heading">Bag</div>
          <div className="inner">
            <ul>{items}</ul>
          </div>
        </div>

        <div className="equipment">
          <div className="heading">Equipment</div>
          <div className="inner">
            <div className="slot head-item">
              <Item resources={resources} item={me.headItem}
                    onClick={this.dequip.bind(this, "headItem")} />
            </div>

            <div className="slot torso-item">
              <Item resources={resources} item={me.torsoItem}
                    onClick={this.dequip.bind(this, "torsoItem")} />
            </div>

            <div className="slot legs-item">
              <Item resources={resources} item={me.legsItem}
                    onClick={this.dequip.bind(this, "legsItem")} />
            </div>

            <div className="slot feet-item">
              <Item resources={resources} item={me.feetItem}
                    onClick={this.dequip.bind(this, "feetItem")} />
            </div>

            <div className="slot weapon">
              <Item resources={resources} item={me.weapon}
                    onClick={this.dequip.bind(this, "weapon")} />
            </div>
          </div>
        </div>
      </div>
    </div>;
  }
});
