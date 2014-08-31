/** @jsx React.DOM */

module React from "react";

module sprites from "client/assets/sprites";
module titles from "client/constants/titles";

var Item = React.createClass({
  render: function () {
    var title = titles.items[this.props.item.type];

    var sprite = sprites[["item", this.props.item.type].join(".")];
    var img = sprite.getResource(this.props.resources);
    var firstFrame = sprite.frames[0];

    var background = "url(\"" + img.src + "\") " +
                     -firstFrame.x + "px " +
                     -firstFrame.y + "px " +
                     "no-repeat";

    return <a className="item" onClick={this.onClick}>
      <div className="sprite" style={{background: background}} />
      <div className="title">{title.indefinite}</div>
    </a>;
  },

  onClick: function () {
    console.log("use me!");
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
      <div className="inner">
        <ul>{items}</ul>
      </div>
    </div>;
  }
});
