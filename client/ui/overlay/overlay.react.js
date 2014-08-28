/** @jsx React.DOM */

module React from "react";

module names from "client/ui/overlay/names.react";

export var Overlay = React.createClass({
  render: function () {
    var realm = this.props.game.realm;
    var renderer = this.props.game.renderer;

    var position = renderer.toScreenCoords(renderer.topLeft);

    return <div className="overlay"
                style={{transform: "translate(" +
                    (-position.x + "px") + "," +
                    (-position.y + "px") + ")"}}>
      <names.Names realm={realm} renderer={renderer} />
      <div className="components">{renderer.components}</div>
    </div>;
  }
});
