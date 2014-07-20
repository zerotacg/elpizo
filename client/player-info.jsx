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
      <Icon taxonomy="creature" kind={this.props.kind} variant={this.props.variant} />
      <div className="stats">
        <div className="name left">
          {this.props.name} <small>{titles.creature[names.creature[this.props.kind]]} {this.props.level}</small>
        </div>
        <div className="right">{this.state.time}</div>
        <div className="bars clear">
          <Bar max={this.props.maxHp} value={this.props.hp} className="hp" />
          <Bar max={this.props.maxMp} value={this.props.mp} className="mp" />
          <Bar max={this.props.maxXp} value={this.props.xp} className="xp" />
        </div>
      </div>
    </div>;
  }
}

var PlayerInfo = React.createClass(_PlayerInfo.prototype);
export default = PlayerInfo;
