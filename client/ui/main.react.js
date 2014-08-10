/** @jsx React.DOM */

module React from "react";

import {Chat} from "./chat.react";

export var UI = React.createClass({
  onKeyDown: function (e) {
    e.stopPropagation();
  },

  render: function () {
    return <div onKeyDown={this.onKeyDown}>
      <Chat game={this.props.game} />
    </div>;
  }
});
