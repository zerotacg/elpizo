/** @jsx React.DOM */

module React from "react";

module sprites from "client/assets/sprites";
module entities from "client/models/entities";
module items from "client/models/items";
module equipment from "client/models/items/equipment";
module packets from "client/protos/packets";

export var Item = React.createClass({
  render: function () {
    var title = "(no item)";
    var background = null;
    var onClick = () => { };

    if (this.props.item !== null) {
      title = this.props.item.getIndefiniteTitle();

      var sprite = sprites[["item", this.props.item.type].join(".")];
      var img = sprite.getResource(this.props.resources);
      var firstFrame = sprite.frames[0];

      background = "url(\"" + img.src + "\") " +
                   -firstFrame.x + "px " +
                   -firstFrame.y + "px " +
                   "no-repeat";

      onClick = this.props.onClick;
    }

    return <a className="item" onClick={onClick} title={title}>
      <span className="sprite" style={{background: background}} />
      <span className="title">{title}</span>
    </a>;
  }
})

export var Inventory = React.createClass({
  dequip: function (slot) {
    var item = this.props.me[slot];
    this.props.me[slot] = null;

    this.props.protocol.send(new packets.ModifyEquipmentPacket({
        slot: item.getSlot(),
        inventoryIndex: null
    }));
  },

  render: function () {
    var me = this.props.me;

    var resources = this.props.resources;

    var items = me.inventory.map((item, i) => {
      var menu = item.getInventoryActions().map((action, j) =>
        <li key={j}>
          <a onClick={action.f.bind(item,
                                    this.props.protocol,
                                    this.props.me,
                                    i)}>{action.title}</a>
        </li>);

      return <li key={i}>
        <Item resources={resources} item={item} />
        <ul className="actions">{menu}</ul>
      </li>
    }).reverse();

    return <div className={"inventory" + (this.props.show ? "" : " hidden")}>
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
