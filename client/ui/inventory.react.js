/** @jsx React.DOM */

module React from "react";

module sprites from "client/assets/sprites";

var Item = React.createClass({
  render: function () {
    var sprite = sprites[["item", this.props.item.type].join(".")];
    return <img src={sprite.getResource(this.props.resources).src} />;
  }
})

export var Inventory = React.createClass({
  render: function () {
    var me = this.props.game.me;
    if (me === null) {
      return null;
    }

    var resources = this.props.game.resources;

    var items = me.inventory.map((item, i) =>
      <li key={i}><Item resources={resources} item={item} /></li>);

    return <div className={"inventory " + (this.props.show ? "" : "hidden")}>
      <div className="heading">Inventory</div>
      <ul>{items}</ul>
    </div>;
  }
});
