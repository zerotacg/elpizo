"use strict";

var api = require("./api");

var Top = require("./top.jsx");
var Middle = require("./middle.jsx");
var Chat = require("./chat.jsx");

var ExploreTab = require("./tabs/explore.jsx");
var InventoryTab = require("./tabs/inventory.jsx");

var App = React.createClass({
  getInitialState: function () {
    return {
      player: {
        name: "???",
        playerKind: "unknown",
        playerLevel: -1,
        hp: -1,
        mp: -1,
        xp: -1,
        maxHp: -1,
        maxMp: -1,
        maxXp: -1
      }
    };
  },

  componentWillMount: function () {
    this.updateFromPlayer();
  },

  updateFromPlayer: function () {
    api.getPlayer().then(function (resp) {
      this.setState({
        player: {
          name: resp.name,
          kind: resp.kind,
          level: resp.level,
          hp: 50,
          mp: 50,
          xp: 50,
          maxHp: 100,
          maxMp: 100,
          maxXp: 100
        }
      });
    }.bind(this));
  },

  render: function () {
    var activeTab = this.state.activeTab;

    return <div>
      {Top(this.state.player)}

      <Middle
          tabs={[
              {
                  id: "explore",
                  name: "Explore",
                  element: <ExploreTab transport={this.props.transport} />
              },
              {
                  id: "inventory",
                  name: "Inventory",
                  element: <InventoryTab />
              },
              {
                  id: "quests",
                  name: "Quests",
                  element: <div></div>
              },
              {
                  id: "skills",
                  name: "Skills",
                  element: <div></div>
              },
              {
                  id: "guild",
                  name: "Guild",
                  element: <div></div>
              },
              {
                  id: "property",
                  name: "Property",
                  element: <div></div>
              }
          ]} />

      <Chat playerName={this.state.player.name}
            transport={this.props.transport} />
    </div>;
  },
});

module.exports = App;
