/** @jsx React.DOM */

module React from "react";

module names from "../../constants/names";
module titles from "../../constants/titles";

module Icon from "../parts/icon.jsx";
module List from "../parts/list.jsx";
module Menu from "../parts/menu.jsx";

module Chat from "../chat.jsx";

import {classSet} from "../../util/react";
import {nubStrings} from "../../util/collections";

module exploreStore from "../../stores/explore";
module exploreActions from "../../actions/explore";

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
          {this.props.name} <small>{titles[this.props.taxonomy][names[this.props.taxonomy][this.props.kind]]} {this.props.level}</small>
        </span>
      </a>
      <Menu items={[
          {id: "talk", title: "Talk"},
          {id: "info", title: "Info"}
      ]} />
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
    return exploreStore.get();
  }

  _onChange() {
    this.setState(exploreStore.get());
  }

  componentWillMount() {
    exploreActions.fetch();
  }

  componentDidMount() {
    exploreStore.addChangeListener(this._onChange);
  }

  componentDidUnmount() {
    exploreStore.removeChangeListener(this._onChange);
  }

  createEntityItem(taxonomy, entity) {
    return <EntityItem name={entity.name} taxonomy={taxonomy}
                       kind={entity.kind} variant={entity.variant}
                       level={entity.level}
                       key={entity.id} />;
  }

  render() {
    var explore = this.state;

    if (!explore) {
      return null;
    }

    var i = explore.tile.x - explore.map.x;
    var j = explore.tile.y - explore.map.y;

    var nw = i >= 0 && j >= 0
             ? explore.map.corners[(j + 0) * (explore.map.w + 1) + (i + 0)]
             : null;
    var ne = i < explore.map.w && j >= 0
             ? explore.map.corners[(j + 0) * (explore.map.w + 1) + (i + 1)]
             : null;
    var sw = i >= 0 && j < explore.map.h
             ? explore.map.corners[(j + 1) * (explore.map.w + 1) + (i + 0)]
             : null;
    var se = i < explore.map.w && j < explore.map.h
             ? explore.map.corners[(j + 1) * (explore.map.w + 1) + (i + 1)]
             : null;

    var terrains = [nw, ne, sw, se];
    var terrainFrequencies = {};
    terrains.forEach((terrain) => {
      terrainFrequencies[terrain] = (terrainFrequencies[terrain] || 0) + 1;
    });

    var terrains = nubStrings([nw, ne, sw, se]
        .sort((a, b) => terrainFrequencies[a] - terrainFrequencies[b]))
        .map((id) => titles.terrain[names.terrain[id]])
        .join("/");

    return <div id="explore">
      <Chat />
      <div className="nearby">
        <div className="name">
          {terrains} <small>{explore.tile.x}, {explore.tile.y} {explore.tile.realm.name}</small>
        </div>

        <div className="long">
          <List items={explore.creatures.map(this.createEntityItem.bind(null, "creature"))} />
          <List items={explore.buildings.map(this.createEntityItem.bind(null, "building"))} />
        </div>

        <div className="short">
          <div className="left">
            <List items={explore.items.map(this.createEntityItem.bind(null, "item"))} />
          </div>

          <div className="right">
            <List items={explore.facilities.map(this.createEntityItem.bind(null, "facility"))} />
          </div>
        </div>
      </div>
    </div>;
  }
}
var ExploreTab = React.createClass(_ExploreTab.prototype);
export default = ExploreTab;
