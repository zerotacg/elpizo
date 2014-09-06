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
      var status = "Connecting to server...";

      if (!this.props.game.resources.isLoadingComplete()) {
        status = <span>Loading resources (
            {this.props.game.resources.getNumResourcesLoaded()}/
            {this.props.game.resources.getNumResources()}
        )...</span>;
      }

      body = <div className="loading transitionable">
        <div className="center">
          <div className="primary">
            <div><img src="/img/logo.png" title="Rekindled Hope"
                      alt="Rekindled Hope" /></div>
            <div>{status}</div>
            <Progress value={this.props.game.resources.getNumResourcesLoaded()}
                      max={this.props.game.resources.getNumResources()} />
          </div>
        </div>
      </div>;
    }

    return <div className="modal">{body}</div>;
  }
});
