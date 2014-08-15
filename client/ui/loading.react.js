/** @jsx React.DOM */

module React from "react";

export var Loading = React.createClass({
  render: function () {
    if (this.props.game.running) {
      return null;
    }

    if (this.props.game.protocol.lastError !== null) {
      message = "Error: " + this.props.game.protocol.lastError;
    } else {
      message = "Loading..."
    }

    return <div className="loading">
      {{message}}
    </div>;
  }
});
