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

class _App {
  render() {
    return <div>
      <Map />
      <div className="ui">
        <PlayerInfo />
        <Switcher tabs={[
            {name: "Explore", id: "explore", element: <ExploreTab />},
            {name: "Inventory", id: "inventory", element: <InventoryTab />},
            {name: "Quests", id: "quests", element: <QuestsTab />},
            {name: "Skills", id: "skills", element: <SkillsTab />},
            {name: "Guild", id: "guild", element: <GuildTab />},
            {name: "Property", id: "property", element: <PropertyTab />}
        ]} />
      </div>
    </div>;
  }
}

var App = React.createClass(_App.prototype);
export default = App;
