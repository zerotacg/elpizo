/** @jsx React.DOM */

module React from "react";

module sprites from "client/assets/sprites";
module titles from "client/constants/titles";
module entities from "client/models/entities";
module items from "client/models/items";
module packets from "client/protos/packets";

var Item = React.createClass({
  render: function () {
    var displayName = "(no item)";
    var background = null;

    if (this.props.item !== null) {
      displayName = titles.items[this.props.item.type].indefinite;

      var sprite = sprites[["item", this.props.item.type].join(".")];
      var img = sprite.getResource(this.props.resources);
      var firstFrame = sprite.frames[0];

      background = "url(\"" + img.src + "\") " +
                   -firstFrame.x + "px " +
                   -firstFrame.y + "px " +
                   "no-repeat";
    }

    return <a className="item" onClick={this.props.onClick} title={displayName}>
      <div className="sprite" style={{background: background}} />
      <div className="title">{displayName}</div>
    </a>;
  }
})

export var Inventory = React.createClass({
  discard: function (i) {
    this.props.game.protocol.send(new packets.DiscardPacket({
        inventoryIndex: i
    }));
    this.props.game.me.discard(i);
  },

  dequip: function (slot) {
    var equipment = this.props.game.me[slot];
    this.props.game.me[slot] = null;

    this.props.game.protocol.send(new packets.ModifyEquipmentPacket({
        slot: items.Equipment.SLOTS[slot],
        inventoryIndex: null
    }));
  },

  render: function () {
    var me = this.props.game.me;
    if (me === null) {
      return null;
    }

    var resources = this.props.game.resources;

    var items = me.inventory.map((item, i) =>
      <li key={i}>
        <Item resources={resources} item={item}
              onClick={this.discard.bind(this, i)} />
      </li>);

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
