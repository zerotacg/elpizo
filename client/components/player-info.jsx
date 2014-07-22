/** @jsx React.DOM */

module React from "react";

module titles from "../constants/titles";
module names from "../constants/names";

module Bar from "./parts/bar.jsx";
module Icon from "./parts/icon.jsx";

module playerStore from "../stores/player";
module playerActions from "../actions/player";

class _PlayerInfo {
  getInitialState() {
    return {
        time: "",
        player: playerStore.get()
    };
  }

  _onChange() {
    this.setState({
        player: playerStore.get()
    });
  }

  componentWillMount() {
    playerActions.fetch();
  }

  componentDidMount() {
    playerStore.addChangeListener(this._onChange);
  }

  componentDidUnmount() {
    playerStore.removeChangeListener(this._onChange);
  }

  render() {
    var player = this.state.player;

    if (!player) {
      return null;
    }

    return <div className="player-info">
      <Icon taxonomy="creature"
            kind={player.creature.kind}
            variant={player.creature.variant} />
      <div className="stats">
        <div className="name left">
          {player.creature.name} <small>{titles.creature[names.creature[player.creature.kind]]} {player.creature.level}</small>
        </div>
        <div className="right">{this.state.time}</div>
        <div className="bars clear">
          <Bar max={player.creature.maxHp}
               value={player.creature.hp}
               className="hp" />
          <Bar max={player.creature.maxMp}
               value={player.creature.mp}
               className="mp" />
          <Bar max={player.creature.maxXp}
               value={player.creature.xp}
               className="xp" />
        </div>
      </div>
    </div>;
  }
}

var PlayerInfo = React.createClass(_PlayerInfo.prototype);
export default = PlayerInfo;
