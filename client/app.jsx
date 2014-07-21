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
        player: null,
        nearby: null,
        map: null
    };
  }

  updatePlayer(promise) {
    return promise.then((player) => {
      this.setState({
          player: player
      });

      return player;
    });
  }

  updateNearby(promise) {
    return promise.then((nearby) => {
      this.setState({
        nearby: nearby
      });

      return nearby;
    });
  }

  updateMap(promise) {
    return promise.then((map) => {
      this.setState({
        map: map
      });

      return nearby;
    });
  }

  componentWillMount() {
    this.explore = openExplore(this.props.transport);

    this.updatePlayer(getPlayer());
    this.updateNearby(getExploreNearby());
    this.updateMap(getExploreMap());
  }

  render() {
    if (this.state.player === null ||
        this.state.nearby === null ||
        this.state.map === null) {
      return null;
    }

    var playerName = this.state.player.creature.name;

    return <div>
      <Map onMapClick={this.onMove} map={this.state.map}
           resources={this.props.resources}
           playerX={this.state.nearby.tile.x}
           playerY={this.state.nearby.tile.y} />

      <div className="ui">
        {PlayerInfo(this.state.player)}
        <Switcher tabs={[
            {name: "Explore", id: "explore", element: <ExploreTab
                transport={this.props.transport}
                playerName={playerName}
                nearby={this.state.nearby}
            />},
            {name: "Inventory", id: "inventory", element: <InventoryTab
                playerName={playerName}
            />},
            {name: "Quests", id: "quests", element: <QuestsTab
                playerName={playerName}
            />},
            {name: "Skills", id: "skills", element: <SkillsTab
                playerName={playerName}
            />},
            {name: "Guild", id: "guild", element: <GuildTab
                playerName={playerName}
            />},
            {name: "Property", id: "property", element: <PropertyTab
                playerName={playerName}
            />}
        ]} />
      </div>
    </div>;
  }

  onMove(e) {
    return this.updateNearby(postExploreMove({
        x: e.x,
        y: e.y
    }));
  }
}

var App = React.createClass(_App.prototype);
export default = App;
