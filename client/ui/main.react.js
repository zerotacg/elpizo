/** @jsx React.DOM */

module React from "react";

module debug from "client/ui/debug.react";
module inventory from "client/ui/inventory.react";
module loading from "client/ui/loading.react";
module log from "client/ui/log.react";
module stats from "client/ui/stats.react";
module overlay from "client/ui/overlay/overlay.react";

export var UI = React.createClass({
  onKeyDown: function (e) {
    e.stopPropagation();
  },

  render: function () {
    var uiElements = null;

    if (this.props.game.resourcesLoaded) {
      uiElements = <div>
        <overlay.Overlay game={this.props.game} />
        <log.Log game={this.props.game} log={this.props.game.log.slice()} />
        <debug.Debug game={this.props.game} />
        <stats.Stats game={this.props.game} />
        <inventory.Inventory game={this.props.game} show={this.props.showInventory} />
      </div>;
    }

    // We copy the log because we need to know if it changed length.
    return <div className="ui-root" onKeyDown={this.onKeyDown}>
      {uiElements}
      <loading.Loading game={this.props.game} />
    </div>;
  }
});
