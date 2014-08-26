/** @jsx React.DOM */

module React from "react";

module playerNames from "client/ui/overlay/playerNames.react";

export var Overlay = React.createClass({
  render: function () {
    var renderer = this.props.game.renderer;

    var position = renderer.toScreenCoords(renderer.topLeft);

    return <div className="overlay"
                style={{transform: "translate(" +
                    (-position.x + "px") + "," +
                    (-position.y + "px") + ")"}}>
      <playerNames.PlayerNames game={this.props.game} />
      <div className="components">{renderer.components}</div>
    </div>;
  }
});
