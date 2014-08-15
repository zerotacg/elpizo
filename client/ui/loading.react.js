/** @jsx React.DOM */

module React from "react";

export var Loading = React.createClass({
  render: function () {
    if (this.props.game.running) {
      return null;
    }
    return <div className="loading">
      Waiting for connection...
    </div>;
  }
});
