/** @jsx React.DOM */

module React from "react";

module lexicon from "../lexicon";

module Icon from "../parts/icon.jsx";
module List from "../parts/list.jsx";
module Menu from "../parts/menu.jsx";

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
  createEntityItem(taxonomy, entity) {
    return <EntityItem name={entity.name} taxonomy={taxonomy}
                       kind={entity.kind} variant={entity.variant}
                       level={entity.level}
                       key={entity.id} />;
  }

  render() {
    var nearby = this.props.nearby;

    return <div id="explore">
      <Chat transport={this.props.transport}
            playerName={this.props.playerName} />

      <div className="nearby">
        <div className="name">
          {nearby.name} <small>{nearby.x}, {nearby.y} {nearby.realm}</small>
        </div>

        <div className="long">
          <List items={nearby.creatures.map(this.createEntityItem.bind(null, "creature"))} />
          <List items={nearby.buildings.map(this.createEntityItem.bind(null, "building"))} />
        </div>

        <div className="short">
          <div className="left">
            <List items={nearby.items.map(this.createEntityItem.bind(null, "item"))} />
          </div>

          <div className="right">
            <List items={nearby.facilities.map(this.createEntityItem.bind(null, "facility"))} />
          </div>
        </div>
      </div>
    </div>;
  }
}
var ExploreTab = React.createClass(_ExploreTab.prototype);
export default = ExploreTab;
