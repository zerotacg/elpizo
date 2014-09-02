/** @jsx React.DOM */

module React from "react/react-with-addons";

module debug from "client/ui/debug.react";
module inventory from "client/ui/inventory.react";
module interactions from "client/ui/interactions.react";
module loading from "client/ui/loading.react";
module log from "client/ui/log.react";
module stats from "client/ui/stats.react";
module overlay from "client/ui/overlay/overlay.react";

var Item = React.createClass({
  render: function () {
    return React.DOM.div(this.props);
  }
});

export var UI = React.createClass({
  render: function () {
    var hudElements = [];

    if (this.props.game.resourcesLoaded) {
      if (this.props.game.me !== null) {
        if (this.props.game.debug) {
          hudElements.push(<Item key="debug">
              <debug.Debug game={this.props.game} />
          </Item>);
        }

        hudElements.push(<Item key="log">
            <log.Log
                game={this.props.game}
                log={this.props.game.log.slice()} />
        </Item>);

        hudElements.push(<Item key="stats">
            <stats.Stats
                me={this.props.game.me}
                resources={this.props.game.resources} />
        </Item>);

        if (this.props.showInventory) {
          hudElements.push(<Item key="inventory">
              <inventory.Inventory
                  me={this.props.game.me}
                  resources={this.props.game.resources}
                  protocol={this.props.game.protocol}
                  log={this.props.game.log} />
          </Item>);
        }

        if (this.props.game.me.interactions.length > 0) {
          hudElements.push(<Item key="interactions">
              <interactions.InteractionsMenu
                  me={this.props.game.me}
                  protocol={this.props.game.protocol}
                  log={this.props.game.log} />
          </Item>);
        }
      }
    }

    // We copy the log because we need to know if it changed length.
    return <div className="ui-root">
      <overlay.Overlay game={this.props.game} />
      <React.addons.CSSTransitionGroup transitionName="slide"
                                       component={React.DOM.div}>
        {hudElements}
      </React.addons.CSSTransitionGroup>
      <loading.Loading game={this.props.game} />
    </div>;
  }
});
