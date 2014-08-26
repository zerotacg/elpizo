/** @jsx React.DOM */

module React from "react";

module playerNames from "client/ui/overlay/playerNames.react";

export var Overlay = React.createClass({
  render: function () {
    var position = this.props.game.renderer.toScreenCoords(
        this.props.game.renderer.topLeft);

    return <div className="overlay"
                style={{transform: "translate(" +
                    (-position.x + "px") + "," +
                    (-position.y + "px") + ")"}}>
      <playerNames.PlayerNames game={this.props.game} />
    </div>;
  }
});
