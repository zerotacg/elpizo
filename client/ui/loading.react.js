/** @jsx React.DOM */

module React from "react/react-with-addons";

export var Loading = React.createClass({
  render: function () {
    if (this.props.game.running) {
      return null;
    }

    var body;

    if (this.props.game.lastError !== null) {
      body = <div className="error transitionable">
          <div className="heading">Error</div>
          <div className="content">
            <div>
              <p>An unexpected error has occurred.</p>
              <pre>{this.props.game.lastError}</pre>
              <p>Your session has been closed. Please try logging in again.</p>
            </div>
          </div>
        </div>;
    } else if (!this.props.game.resourcesLoaded) {
      body = <div className="transitionable">Loading resources...</div>;
    } else {
      body = <div className="transitionable">Connecting to server...</div>;
    }

    return <div className="center modal">{body}</div>;
  }
});
