/** @jsx React.DOM */

module React from "react";

module Map from "./map.jsx";
module PlayerInfo from "./player-info.jsx";
module Switcher from "./switcher.jsx";

module ExploreTab from "./tabs/explore.jsx";
module InventoryTab from "./tabs/inventory.jsx";
module QuestsTab from "./tabs/quests.jsx";
module SkillsTab from "./tabs/skills.jsx";
module GuildTab from "./tabs/guild.jsx";
module PropertyTab from "./tabs/property.jsx";

import {getPlayer, getExploreNearby, openExplore, postExploreMove} from "./api";

class _App {
  getInitialState() {
    return {
        player: {
            name: "Unknown Player",
            playerKind: "unknown",
            playerLevel: -1,
            hp: -1,
            mp: -1,
            xp: -1,
            maxHp: -1,
            maxMp: -1,
            maxXp: -1
        },

        nearby: {
          x: -1,
          y: -1,
          realm: "Unknown Realm",
          name: "The Void",
          creatures: [],
          buildings: [],
          items: [],
          facilities: []
        }
    };
  }

  updatePlayer(promise) {
    promise.then((player) => {
      this.setState({
          player: player
      });
    });
  }

  updateNearby(promise) {
    promise.then((nearby) => {
      this.setState({
        nearby: nearby
      });
    });
  }

  componentWillMount() {
    this.explore = openExplore(this.props.transport);

    this.updatePlayer(getPlayer());
    this.updateNearby(getExploreNearby());
  }

  render() {
    return <div>
      <Map onMapClick={this.onMove} />

      <div className="ui">
        <PlayerInfo name="Valjean" kind="human" level={10}
                    hp={50} maxHp={100}
                    mp={50} maxMp={100}
                    xp={50} maxXp={100} />
        <Switcher tabs={[
            {name: "Explore", id: "explore", element: <ExploreTab
                transport={this.props.transport}
                playerName={this.state.player.name}
                nearby={this.state.nearby} />},
            {name: "Inventory", id: "inventory", element: <InventoryTab
                playerName={this.state.player.name} />},
            {name: "Quests", id: "quests", element: <QuestsTab
                playerName={this.state.player.name} />},
            {name: "Skills", id: "skills", element: <SkillsTab
                playerName={this.state.player.name} />},
            {name: "Guild", id: "guild", element: <GuildTab
                playerName={this.state.player.name} />},
            {name: "Property", id: "property", element: <PropertyTab
                playerName={this.state.player.name} />}
        ]} />
      </div>
    </div>;
  }

  onMove(e) {
    this.updateNearby(postExploreMove({
      x: e.clientX, y: e.clientY
    }));
  }
}

var App = React.createClass(_App.prototype);
export default = App;
