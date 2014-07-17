"use strict";

var api = require("../api");
var lexicon = require("../lexicon");

var Icon = require("../parts/icon.jsx");
var List = require("../parts/list.jsx");
var Menu = require("../parts/menu.jsx");

function showEntity(taxonomy, entity) {
  return {
      id: entity.id,
      title: entity.name,
      subtitle: lexicon[taxonomy][entity.kind] + " " + entity.level,
      icon: <Icon taxonomy={taxonomy} kind={entity.kind} variant="1" size="big" />,
      menu: <Menu items={[
        {title: "Talk", subtitle: "", id: "talk"},
        {title: "Tame", subtitle: "Beastmastery 100", id: "tame"},
        {title: "Info", subtitle: "", id: "info"}
      ]} />
  };
}

var Explore = React.createClass({
  getInitialState: function () {
    return {
        name: "Unknown",
        x: -1,
        y: -1,
        realm: "The Ether",
        creatures: [],
        buildings: [],
        items: [],
        facilities: []
    };
  },

  componentWillMount: function () {
    this.updateFromNearby();
    this.explore = api.openExplore(this.props.transport);
  },

  updateFromNearby: function () {
    api.getExploreNearby().then(function (nearby) {
      this.setState({
          name: nearby.name,
          x: nearby.x,
          y: nearby.y,
          realm: nearby.realm,
          creatures: nearby.creatures.map(showEntity.bind(null, "creature")),
          buildings: nearby.buildings.map(showEntity.bind(null, "building")),
          items: nearby.items.map(showEntity.bind(null, "item")),
          facilities: nearby.facilities.map(showEntity.bind(null, "facility"))
      });
    }.bind(this));
  },

  render: function () {
    return <div className="explore">
      <div className="row">
        <div className="col primary">
          <div className="map"></div>
        </div>
        <div className="col secondary">
          <div className="name">
            {this.state.name} <small>{this.state.x}, {this.state.y} {this.state.realm}</small>
          </div>

          <div className="row columns">
            <div className="col">
              <div className="well">
                <List type="card" items={this.state.creatures} />
              </div>
            </div>
            <div className="col">
              <div className="well">
                <List type="card" items={this.state.buildings} />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <div className="well entities">
                <div className="left">
                  <List type="square" items={this.state.items} />
                </div>

                <div className="right">
                  <List type="square" items={this.state.facilities} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
  }
});

module.exports = Explore;
