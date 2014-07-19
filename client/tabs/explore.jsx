/** @jsx React.DOM */

module React from "react";

module api from "../api";
module lexicon from "../lexicon";

module Icon from "../parts/icon.jsx";
module List from "../parts/list.jsx";

module Chat from "../chat.jsx";

import {classSet} from "../util/react";

class _EntityItem {
  getInitialState() {
    return {
        active: false
    };
  }

  render() {
    var classes = {
      "active": this.state.active
    };

    return <li className={classSet(classes)}>
      <a className="item-header" href="#" onClick={this.onHeaderClick}>
        <Icon taxonomy={this.props.taxonomy} kind={this.props.kind}
              variant={this.props.variant} />
        <span className="name">
          {this.props.name} <small>{lexicon[this.props.taxonomy][this.props.kind]} {this.props.level}</small>
        </span>
      </a>
      <ul className="menu">
        <li><a href="#">Talk</a></li>
        <li><a href="#">Info</a></li>
      </ul>
    </li>;
  }

  onHeaderClick(e) {
    e.preventDefault();
    this.setState({
        active: !this.state.active
    });
  }
}
var EntityItem = React.createClass(_EntityItem.prototype);

class _ExploreTab {
  getInitialState() {
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
  }

  render() {
    return <div id="explore">
      <Chat transport={this.props.transport}
            playerName={this.props.playerName} />

      <div className="nearby">
        <div className="name">Tall Grass <small>31, 58 Wyrm Vale</small></div>

        <div className="long">
          <List items={[
            <EntityItem name="Thénardier" taxonomy="creature" kind="human"
                        variant="1" level={100} key="1" />
          ]} />
          <List items={[
            <EntityItem name="Aubrey" taxonomy="creature" kind="human"
                        variant="1" level={100} key="2" />
          ]} />
        </div>

        <div className="short">
          <div className="left">
            <List />
          </div>

          <div className="right">
            <List />
          </div>
        </div>
      </div>
    </div>;
  }
}
var ExploreTab = React.createClass(_ExploreTab.prototype);
export default = ExploreTab;

var Explore = React.createClass({
  getInitialState: function () {
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
          creatures: nearby.creatures.map(showCreature),
          buildings: nearby.buildings.map(showBuilding),
          items: nearby.items.map(showItem),
          facilities: nearby.facilities.map(showFacility)
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
