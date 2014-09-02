/** @jsx React.DOM */

module React from "react/react-with-addons";

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
    var hudElements = [];

    if (this.props.game.resourcesLoaded) {
      if (this.props.game.me !== null) {
        hudElements.push(<div key="debug">
            <debug.Debug game={this.props.game} />
        </div>);

        hudElements.push(<div key="log">
            <log.Log
                game={this.props.game}
                log={this.props.game.log.slice()} />
        </div>);

        hudElements.push(<div key="stats">
            <stats.Stats
                me={this.props.game.me}
                resources={this.props.game.resources} />
        </div>);

        if (this.props.game.me.interactions.length > 0) {
          hudElements.push(<div key="interactions">
              <interactions.InteractionsMenu
                  me={this.props.game.me}
                  protocol={this.props.game.protocol}
                  log={this.props.game.log} />
          </div>);
        }

        if (this.props.showInventory) {
          hudElements.push(<div key="inventory">
              <inventory.Inventory
                  me={this.props.game.me}
                  resources={this.props.game.resources}
                  protocol={this.props.game.protocol}
                  log={this.props.game.log} />
          </div>);
        }
      }
    }

    // We copy the log because we need to know if it changed length.
    return <div className="ui-root" onKeyDown={this.onKeyDown}>
      <overlay.Overlay game={this.props.game} />
      <React.addons.CSSTransitionGroup transitionName="slide"
                                       component={React.DOM.div}>
        {hudElements}
      </React.addons.CSSTransitionGroup>
      <loading.Loading game={this.props.game} />
    </div>;
  }
});
