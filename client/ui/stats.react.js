/** @jsx React.DOM */

module React from "react";

module renderer from "client/graphics/renderer";
module colors from "client/util/colors";
module sprites from "client/assets/sprites";

export var Stats = React.createClass({
  render: function () {
    var resources = this.props.game.resources;
    var me = this.props.game.me;

    if (me === null) {
      return null;
    }

    var ticks = [];
    for (var i = 0; i < me.health; ++i) {
      ticks.push(<li key={i} className="tick"></li>);
    }

    //console.log(renderer.getActorSpriteNames(me));
    var paperdoll = "";

    if (this.props.game.resourcesLoaded) {
      paperdoll = renderer.getActorSpriteNames(me).map((spriteName) => {
        var sprite = sprites[spriteName].standing.s;
        var firstFrame = sprite.frames[0];
        return "url(\"" + sprite.getResource(resources).src + "\") " +
               -firstFrame.x + "px " +
               -firstFrame.y + "px " +
               "no-repeat";
      }).reverse().join(", ");
    }

    return <div className="stats">
      <div className="avatar" style={{background: paperdoll}}/>
      <div className="info">
        <div className="name" style={{color: colors.makeColorForString(me.name)}}>{me.name}</div>
        <ul className="health">{ticks}</ul>
      </div>
    </div>;
  }
});
