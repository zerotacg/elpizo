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

import {getPlayer, getExplore, openExplore, postExploreMove} from "./api";

class _App {
  getInitialState() {
    return {
        player: null,
        explore: null
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

  updateExplore(promise) {
    return promise.then((explore) => {
      this.setState({
        explore: explore
      });

      return explore;
    });
  }

  componentWillMount() {
    this.exploreProtocol = openExplore(this.props.transport);
    this.updateExplore(getExplore());
    this.updatePlayer(getPlayer());
  }

  render() {
    if (this.state.player === null ||
        this.state.explore === null) {
      return null;
    }

    var playerName = this.state.player.creature.name;

    return <div>
      <Map onMapClick={this.onMove} map={this.state.explore.map}
           resources={this.props.resources}
           playerX={this.state.explore.tile.x}
           playerY={this.state.explore.tile.y} />

      <div className="ui">
        {PlayerInfo(this.state.player)}
        <Switcher tabs={[
            {name: "Explore", id: "explore", element: <ExploreTab
                transport={this.props.transport}
                playerName={playerName}
                explore={this.state.explore}
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
    return this.updateExplore(postExploreMove({
        x: e.x,
        y: e.y
    }));
  }
}

var App = React.createClass(_App.prototype);
export default = App;
