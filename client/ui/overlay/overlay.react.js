/** @jsx React.DOM */

module React from "react";

export var Overlay = React.createClass({
  render: function () {
    var realm = this.props.game.realm;
    var renderer = this.props.game.renderer;

    var position = renderer.toScreenCoords(renderer.topLeft);

    var components = Object.keys(renderer.components).map((k) =>
        renderer.components[k]);

    return <div className="overlay"
                style={{transform: "translate(" +
                    (-position.x + "px") + "," +
                    (-position.y + "px") + ")"}}>
      <div className="components">{components}</div>
    </div>;
  }
});
