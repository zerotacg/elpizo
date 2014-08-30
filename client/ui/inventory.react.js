/** @jsx React.DOM */

module React from "react";

module sprites from "client/assets/sprites";

export var Inventory = React.createClass({
  render: function () {
    if (!this.props.show) {
      return null;
    }

    var resources = this.props.game.resources;

    var items = this.props.game.me.inventory.map((item, i) => {
      var sprite = sprites[["item", item.type].join(".")];
      return <li key={i}>
        <img src={sprite.getResource(resources).src} />
      </li>;
    })

    return <div className="inventory">
      <div className="heading">Inventory</div>
      <ul>{items}</ul>
    </div>;
  }
});
