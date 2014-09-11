/** @jsx React.DOM */

module React from "react/react-with-addons";

export var Mute = React.createClass({
  toggleMute: function() {
    this.props.config.muted = !this.props.config.muted;
  },

  render: function () {
    var config = this.props.config;

    return <div className="mute">
        <button onClick={this.toggleMute}
                className={config.muted ? "muted" : ""}>
          {config.muted ? "music" : "mute"}
        </button>
    </div>;
  }
});
