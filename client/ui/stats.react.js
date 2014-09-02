/** @jsx React.DOM */

module chroma from "chroma-js";
module React from "react/react-with-addons";

module graphicsRenderer from "client/graphics/renderer";
module colors from "client/util/colors";
module sprites from "client/assets/sprites";

var Avatar = React.createClass({
  render: function () {
    var paperdoll = graphicsRenderer.getActorSpriteNames(this.props.me).map(
      (spriteName) => {
        var sprite = sprites[spriteName].standing.s;

        var firstFrame = sprite.frames[0];
        var img = sprite.getResource(this.props.resources);

        return "url(\"" + img.src + "\") " +
               -firstFrame.x + "px " +
               -firstFrame.y + "px " +
               "no-repeat";
      }).reverse().join(", ");

    return <div className="avatar" style={{background: paperdoll}} />;
  }
});

var HealthTicks = React.createClass({
  render: function () {
    var ticks = [];
    for (var i = 0; i < this.props.health; ++i) {
      ticks.push(<li key={i} className="tick"></li>);
    }
    return <ul className="health">{ticks}</ul>;
  }
});

export var Stats = React.createClass({
  toggleInventory: function () {
    this.props.me.showInventory = !this.props.me.showInventory;
  },

  render: function () {
    var me = this.props.me;
    var fill = colors.makeColorForString(me.name);
    var emboss = chroma(fill).darken(10).hex();

    return <div className="stats transitionable" style={{
      backgroundColor: fill,
      boxShadow: "0 4px 0 " + emboss + ", 0 8px 20px rgba(0, 0, 0, 0.5)"
    }}>
      <div className="content">
        <button onClick={this.toggleInventory}
                className={me.showInventory ? "active" : ""}>
          <Avatar resources={this.props.resources} me={me} />
        </button>
        <div className="info">
          <div className="heading">{me.name}</div>
          <HealthTicks health={me.health} />
        </div>
      </div>
    </div>;
  }
});
