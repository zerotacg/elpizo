/** @jsx React.DOM */

module React from "react";

import {Chat} from "./chat.react";
import {Debug} from "./debug.react";

export var UI = React.createClass({
  onKeyDown: function (e) {
    e.stopPropagation();
  },

  render: function () {
    return <div onKeyDown={this.onKeyDown}>
      <Chat game={this.props.game} />
      <Debug game={this.props.game} />
    </div>;
  }
});
