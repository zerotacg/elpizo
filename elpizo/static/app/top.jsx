"use strict";

var lexicon = require("./lexicon");

var Icon = require("./parts/icon.jsx");

module.exports = React.createClass({
  getInitialState: function () {
    return {time: "Time goes here"};
  },

  render: function () {
    return <div className="row top">
      <div className="col">
        <div className="left">
          <Icon taxonomy="creature" kind={this.props.kind} variant="1" size="big" />
        </div>
        <div className="stats left">
          <div className="name left">
            {this.props.name} <small>{lexicon.creature[this.props.kind]} {this.props.level}</small>
          </div>
          <div className="right">{this.state.time}</div>
          <div className="bars clear">
            <div className="bar hp">
              <div className="fill" style={{width: Math.round(this.props.hp / this.props.maxHp * 100) + "%"}}></div>
              <div className="caption">{this.props.hp} / {this.props.maxHp}</div>
            </div>
            <div className="bar mp">
              <div className="fill" style={{width: Math.round(this.props.mp / this.props.maxMp * 100) + "%"}}></div>
              <div className="caption">{this.props.mp} / {this.props.maxMp}</div>
            </div>
            <div className="bar xp">
              <div className="fill" style={{width: Math.round(this.props.xp / this.props.maxXp * 100) + "%"}}></div>
              <div className="caption">{this.props.xp} / {this.props.maxXp}</div>
            </div>
          </div>
        </div>
      </div>
    </div>;
  }
});
