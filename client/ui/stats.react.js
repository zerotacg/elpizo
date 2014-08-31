/** @jsx React.DOM */

module React from "react";

module renderer from "client/graphics/renderer";
module colors from "client/util/colors";
module sprites from "client/assets/sprites";

var Avatar = React.createClass({
  render: function () {
    var paperdoll = renderer.getActorSpriteNames(this.props.me).map(
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
  render: function () {
    var me = this.props.game.me;

    if (me === null) {
      return null;
    }

    return <div className="stats">
      <Avatar resources={this.props.game.resources} me={me} />
      <div className="info">
        <div className="name" style={{color: colors.makeColorForString(me.name)}}>{me.name}</div>
        <HealthTicks health={me.health} />
      </div>
    </div>;
  }
});
