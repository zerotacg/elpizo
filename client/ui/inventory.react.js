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

    return <button className="item"
            type="button"
            onClick={this.onClick}>
      <div className="sprite" style={{background: background}} />
      {title.indefiniteArticle + " " + title.singular}
    </button>;
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
      <ul>{items}</ul>
    </div>;
  }
});
