/** @jsx React.DOM */

module React from "react";

module colors from "client/util/colors";

var PlayerName = React.createClass({
  render: function () {
    var entity = this.props.entity;

    var position = this.props.renderer.toScreenCoords(
        this.props.entity.location);

    return <div className="player-name"
                style={{transform: "translate(" + (position.x + 16 + "px") + "," +
                                                  (position.y + 32 + "px") + ")"}}>
      <div className="inner"
           style={{color: colors.makeColorForString(entity.name)}}>{entity.name}</div>
    </div>;
  }
});

var PlayerNames = React.createClass({
  render: function () {
    if (this.props.game.realm === null) {
      return null;
    }

    var entities = this.props.game.realm.getAllEntities().map((entity) =>
        <PlayerName key={entity.id} entity={entity}
                    renderer={this.props.game.renderer} />);
    return <div>{entities}</div>;
  }
});


export var Overlay = React.createClass({
  render: function () {
    var position = this.props.game.renderer.toScreenCoords(
        this.props.game.renderer.topLeft);

    return <div className="overlay"
                style={{transform: "translate(" + (-position.x + "px") + "," +
                                                  (-position.y + "px") + ")"}}>
      <PlayerNames game={this.props.game} />
    </div>;
  }
});
