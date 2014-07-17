"use strict";

var api = require("../api");

var Icon = require("../parts/icon.jsx");
var List = require("../parts/list.jsx");

function showEntity(entity) {
  return {
      id: entity.id,
      title: entity.name,
      subtitle: "Foo",
      icon: <Icon taxonomy="facility" kind="chest" variant="1" size="big" />
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
          creatures: nearby.creatures.map(showEntity),
          buildings: nearby.buildings.map(showEntity),
          items: nearby.items.map(showEntity),
          facilities: nearby.facilities.map(showEntity)
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
