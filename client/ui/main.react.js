/** @jsx React.DOM */

module React from "react";

import {Chat} from "./chat.react";
import {Debug} from "./debug.react";
import {Loading} from "./loading.react";

export var UI = React.createClass({
  onKeyDown: function (e) {
    e.stopPropagation();
  },

  render: function () {
    return <div onKeyDown={this.onKeyDown}>
      <Chat game={this.props.game} />
      <Debug game={this.props.game} />
      <Loading game={this.props.game} />
    </div>;
  }
});
