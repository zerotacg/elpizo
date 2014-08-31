/** @jsx React.DOM */

module React from "react";

module debug from "client/ui/debug.react";
module inventory from "client/ui/inventory.react";
module interactions from "client/ui/interactions.react";
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
    var hudElements = null;

    if (this.props.game.resourcesLoaded) {
      uiElements = <div>
        <overlay.Overlay game={this.props.game} />
        <log.Log game={this.props.game} log={this.props.game.log.slice()} />
        <debug.Debug game={this.props.game} />
      </div>;

      if (this.props.game.me !== null) {
        var interactionsMenu =
            this.props.game.me.interactions.length > 0 ?
            <interactions.InteractionsMenu me={this.props.game.me}
                                           protocol={this.props.game.protocol} /> :
            null;

        hudElements = <div>
          <stats.Stats me={this.props.game.me}
                       resources={this.props.game.resources} />
          <inventory.Inventory me={this.props.game.me}
                               resources={this.props.game.resources}
                               protocol={this.props.game.protocol}
                               show={this.props.showInventory} />
          {interactionsMenu}
        </div>;
      }
    }

    // We copy the log because we need to know if it changed length.
    return <div className="ui-root" onKeyDown={this.onKeyDown}>
      {uiElements}
      {hudElements}
      <loading.Loading game={this.props.game} />
    </div>;
  }
});
