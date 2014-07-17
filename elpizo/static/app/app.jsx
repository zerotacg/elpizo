"use strict";

var api = require("./api");

var Top = require("./top.jsx");
var Chat = require("./chat.jsx");

var ExploreTab = require("./tabs/explore.jsx");
var InventoryTab = require("./tabs/inventory.jsx");

var Sidebar = React.createClass({
  render: function () {
    var tabs = this.props.tabs.map(function (item) {
      return <li className={item.id === this.props.activeTab ? "active" : ""}
                 id={"sidebar-" + item.id}
                 key={item.id}>
        <a onClick={this.onClick.bind(this, item.id)} href="#"></a>
        <div className="tooltip">
          <div className="name">{item.name}</div>
        </div>
      </li>;
    }.bind(this));

    return <ul className="col sidebar">{tabs}</ul>;
  },

  onClick: function (id) {
    this.props.onTabClick(id);
  }
});

var Middle = React.createClass({
  getInitialState: function () {
    return {
      activeTab: "explore"
    };
  },

  render: function () {
    var tabs = this.props.tabs.map(function (tab) {
      return <div className={"tab " + (this.state.activeTab == tab.id ? "active" : "hidden")}
                  key={tab.id}>
        {tab.element}
      </div>;
    }.bind(this));

    return <div className="row middle">
      <Sidebar tabs={this.props.tabs}
               activeTab={this.state.activeTab}
               onTabClick={this.handleSidebarTabClick} />
      <div className="col main">{tabs}</div>
    </div>;
  },

  handleSidebarTabClick: function (itemId) {
    this.setState({activeTab: itemId});
  }
});

var App = React.createClass({
  getInitialState: function () {
    return {
      playerName: "???"
    };
  },

  componentWillMount: function () {
    api.getPlayer().then(function (resp) {
      this.setState({
        playerName: resp.name
      });
    }.bind(this));
  },

  render: function () {
    var activeTab = this.state.activeTab;

    return <div>
      <Top hp={50} maxHp={100}
           mp={50} maxMp={100}
           xp={50} maxXp={100}
           title={this.state.playerName} subtitle="Mayor 10" />

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

      <Chat playerName={this.state.playerName}
            transport={this.props.transport} />
    </div>;
  },
});

module.exports = App;
