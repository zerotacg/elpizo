/** @jsx React.DOM */

module React from "react/react-with-addons";

module sprites from "client/assets/sprites";
module entities from "client/models/entities";
module items from "client/models/items";
module equipment from "client/models/items/equipment";
module packets from "client/protos/packets";

export var Item = React.createClass({
  render: function () {
    var title = "(no item)";
    var background = null;

    if (this.props.item !== null) {
      title = this.props.item.getIndefiniteTitle();

      var sprite = sprites[["item", this.props.item.type].join(".")];
      var img = sprite.getResource(this.props.resources);
      var firstFrame = sprite.frames[0];

      background = "url(\"" + img.src + "\") " +
                   -firstFrame.x + "px " +
                   -firstFrame.y + "px " +
                   "no-repeat";
    }

    return <div className="item" title={title}>
      <span className="sprite" style={{background: background}} />
      <span className="title">{title}</span>
    </div>;
  }
})

export var Inventory = React.createClass({
  dequip: function (slot) {
    var item = this.props.me[slot];
    if (item !== null) {
      item.doDequip(this.props.protocol, this.props.me, this.props.log);
    }
  },

  render: function () {
    var me = this.props.me;

    var resources = this.props.resources;
    var inventory = Object.keys(me.inventory)
        .map((k) => me.inventory[k]);

    var items = inventory.map((item) => {
      var menu = item.getInventoryActions().map((action, i) =>
        <li key={i}>
          <button onClick={action.f.bind(item, this.props.protocol,
                                         this.props.me, this.props.log)}
                  type="button">
            {action.title}
          </button>
        </li>);

      return <li key={item.id}>
        <Item resources={resources} item={item} />
        <ul className="actions">{menu}</ul>
      </li>
    });

    return <div className="center transitionable">
      <div className="inventory">
        <div className="bag">
          <div className="heading">Bag</div>
          <div className="content">
            <ul>{items}</ul>
          </div>
        </div>

        <div className="equipment">
          <div className="heading">Equipment</div>
          <div className="content">
            <button className="slot head-item"
                    onClick={this.dequip.bind(this, "headItem")}>
              <Item resources={resources} item={me.headItem} />
            </button>

            <button className="slot torso-item"
                    onClick={this.dequip.bind(this, "torsoItem")}>
              <Item resources={resources} item={me.torsoItem} />
            </button>

            <button className="slot legs-item"
                    onClick={this.dequip.bind(this, "legsItem")}>
              <Item resources={resources} item={me.legsItem} />
            </button>

            <button className="slot feet-item"
                    onClick={this.dequip.bind(this, "feetItem")}>
              <Item resources={resources} item={me.feetItem} />
            </button>

            <button className="slot weapon"
                    on onClick={this.dequip.bind(this, "weapon")}>
              <Item resources={resources} item={me.weapon} />
            </button>
          </div>
        </div>
      </div>
    </div>;
  }
});
