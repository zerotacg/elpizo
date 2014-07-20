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

import {getPlayer, getExploreNearby, getExploreMap, openExplore, postExploreMove} from "./api";

class _App {
  getInitialState() {
    return {
        player: {
            name: "Unknown Player",
            kind: -1,
            variant: -1,
            level: -1,
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
          terrains: [],
          creatures: [],
          buildings: [],
          items: [],
          facilities: []
        },

        map: {
          x: -1,
          y: -1,
          w: 0,
          h: 0,
          corners: []
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

  updateMap(promise) {
    promise.then((map) => {
      this.setState({
        map: map
      });
    });
  }

  componentWillMount() {
    this.explore = openExplore(this.props.transport);

    this.updatePlayer(getPlayer());
    this.updateNearby(getExploreNearby());
    this.updateMap(getExploreMap());
  }

  render() {
    return <div>
      <Map onMapClick={this.onMove} map={this.state.map}
           resources={this.props.resources}
           playerX={this.state.nearby.x} playerY={this.state.nearby.y} />

      <div className="ui">
        {PlayerInfo(this.state.player)}
        <Switcher tabs={[
            {name: "Explore", id: "explore", element: <ExploreTab
                transport={this.props.transport}
                playerName={this.state.player.name}
                nearby={this.state.nearby}
            />},
            {name: "Inventory", id: "inventory", element: <InventoryTab
                playerName={this.state.player.name}
            />},
            {name: "Quests", id: "quests", element: <QuestsTab
                playerName={this.state.player.name}
            />},
            {name: "Skills", id: "skills", element: <SkillsTab
                playerName={this.state.player.name}
            />},
            {name: "Guild", id: "guild", element: <GuildTab
                playerName={this.state.player.name}
            />},
            {name: "Property", id: "property", element: <PropertyTab
                playerName={this.state.player.name}
            />}
        ]} />
      </div>
    </div>;
  }

  onMove(e) {
    this.updateNearby(postExploreMove({
        x: e.x,
        y: e.y
    }));
  }
}

var App = React.createClass(_App.prototype);
export default = App;
