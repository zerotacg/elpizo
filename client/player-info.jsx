/** @jsx React.DOM */

module React from "react";

module titles from "./titles";
module names from "./names";

module Bar from "./parts/bar.jsx";
module Icon from "./parts/icon.jsx";

class _PlayerInfo {
  getInitialState() {
    return {
        time: "First day of the Dawnstar"
    };
  }

  render() {
    return <div className="player-info">
      <Icon taxonomy="creature"
            kind={this.props.creature.kind}
            variant={this.props.creature.variant} />
      <div className="stats">
        <div className="name left">
          {this.props.creature.name} <small>{titles.creature[names.creature[this.props.creature.kind]]} {this.props.creature.level}</small>
        </div>
        <div className="right">{this.state.time}</div>
        <div className="bars clear">
          <Bar max={this.props.creature.maxHp}
               value={this.props.creature.hp}
               className="hp" />
          <Bar max={this.props.creature.maxMp}
               value={this.props.creature.mp}
               className="mp" />
          <Bar max={this.props.creature.maxXp}
               value={this.props.creature.xp}
               className="xp" />
        </div>
      </div>
    </div>;
  }
}

var PlayerInfo = React.createClass(_PlayerInfo.prototype);
export default = PlayerInfo;
