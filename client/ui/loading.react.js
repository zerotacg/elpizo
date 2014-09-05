/** @jsx React.DOM */

module React from "react/react-with-addons";

export var Loading = React.createClass({
  render: function () {
    if (this.props.game.running) {
      return null;
    }

    var body;

    if (this.props.game.lastError !== null) {
      body = <div className="center">
        <div className="error transitionable">
          <div className="heading">Error</div>
          <div className="content">
            <div>
              <p>An unexpected error has occurred.</p>
              <pre>{this.props.game.lastError}</pre>
              <p>Your session has been closed. Please try logging in again.</p>
            </div>
          </div>
        </div>
      </div>;
    } else if (!this.props.game.resources.isLoadingComplete()) {
      var resourceNames = Object.keys(this.props.game.resources.resourcesPending).map(
          (name) => <li key={name}>{name}</li>);

      body = <div className="loading">
        <div className="transitionable">
          <div className="progress">
          Loading resources...<br />
          <progress value={this.props.game.resources.getNumResourcesLoaded()}
                    max={this.props.game.resources.getNumResources()} />
          </div>
          <ul>
            {resourceNames}
          </ul>
        </div>
      </div>;
    } else {
      body = <div className="center">
        <div className="transitionable">Connecting to server...</div>
      </div>;
    }

    return <div className="modal">{body}</div>;
  }
});
