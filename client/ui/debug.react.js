/** @jsx React.DOM */

module React from "react";

export var Debug = React.createClass({
  getInitialState: function () {
    return {
        showRegions: false
    };
  },

  render: function () {
    if (!this.props.game.debug) {
      return null;
    }

    var game = this.props.game;

    var viewport = game.renderer.getViewportBounds();
    var cacheBounds = game.renderer.getCacheBounds();

    var maybeRegions = null;
    if (this.state.showRegions && game.realm !== null) {
      var regions = game.realm.getAllRegions()
          .sort((a, b) =>
            a.location.y - b.location.y ||
                a.location.x - b.location.x)
          .map((region) => {
            var bounds = region.getBounds();
            return <li key={region.getKey()}>{region.getKey()} ({bounds.left}, {bounds.top}, {bounds.getRight()}, {bounds.getBottom()})</li>
          });
      maybeRegions = <ul>{regions}</ul>;
    }

    var maybeAvatarPosition = null;
    if (game.me !== null) {
      maybeAvatarPosition = "(" + game.me.location.x.toFixed(2) + ", " + game.me.location.y.toFixed(2) + ")";
    }

    return <div className="debug">
      <table className="attrs">
        <tr>
          <th>Viewport Bounds</th>
          <td>({viewport.left.toFixed(2)}, {viewport.top.toFixed(2)}, {viewport.getRight().toFixed(2)}, {viewport.getBottom().toFixed(2)})</td>
        </tr>

        <tr>
          <th>Cache Bounds</th>
          <td>({cacheBounds.left.toFixed(2)}, {cacheBounds.top.toFixed(2)}, {cacheBounds.getRight().toFixed(2)}, {cacheBounds.getBottom().toFixed(2)})</td>
        </tr>


        <tr>
          <th># Regions Loaded</th>
          <td>
            {game.realm !== null ? game.realm.getAllRegions().length : "(no realm)"} (<a href="#" onClick={this.toggleShowRegions}>{this.state.showRegions ? "hide" : "show"}</a>)
            {maybeRegions}
          </td>
        </tr>

        <tr>
          <th># Entities Loaded</th>
          <td>{game.realm !== null ? game.realm.getAllEntities().length : "(no realm)"}</td>
        </tr>

        <tr>
          <th>Avatar Position</th>
          <td>{maybeAvatarPosition !== null ? maybeAvatarPosition : "(no avatar)"}</td>
        </tr>
      </table>
    </div>;
  },

  toggleShowRegions: function (e) {
    e.preventDefault();
    this.setState({showRegions: !this.state.showRegions});
  },
});
