/** @jsx React.DOM */

module React from "react";

module chat from "client/ui/chat.react";
module debug from "client/ui/debug.react";
module loading from "client/ui/loading.react";

export var UI = React.createClass({
  onKeyDown: function (e) {
    e.stopPropagation();
  },

  render: function () {
    return <div onKeyDown={this.onKeyDown}>
      <chat.Chat game={this.props.game} />
      <debug.Debug game={this.props.game} />
      <loading.Loading game={this.props.game} />
    </div>;
  }
});
