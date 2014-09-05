/** @jsx React.DOM */

module React from "react/react-with-addons";

var Progress = React.createClass({
  render: function () {
    return <div className="progress">
      <div className="value"
           style={{width: (this.props.value / this.props.max * 100) + "%"}}></div>
    </div>;
  }
})

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
    } else {
      var resourceNames = Object.keys(this.props.game.resources.resourcesPending).map(
          (name) => <li key={name}>{name}</li>);
      var status = this.props.game.resources.isLoadingComplete() ?
          "Connecting to server..." :
          "Loading...";

      body = <div className="loading">
        <div className="center">
          <div className="primary">
            <p><img src="/img/logo.png" title="Rekindled Hope"
                    alt="Rekindled Hope" className="transitionable" /></p>
            <p>{status}</p>
          </div>
        </div>
        <Progress value={this.props.game.resources.getNumResourcesLoaded()}
                  max={this.props.game.resources.getNumResources()} />
      </div>;
    }

    return <div className="modal">{body}</div>;
  }
});
