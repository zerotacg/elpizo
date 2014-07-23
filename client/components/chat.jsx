/** @jsx React.DOM */

module React from "react";

import {chatProtocol, exploreProtocol} from "../api";

import {nextMonotonicId} from "../util/objects";

module playerStore from "../stores/player";
module playerActions from "../actions/player";

class _Chat {
  getInitialState() {
    return {
        message: "",
        messages: [],
        player: playerStore.get()
    };
  }

  _onChange() {
    var player = playerStore.get();
    this.setState({
        player: player
    });
  }

  componentWillMount() {
    playerActions.fetch();

    chatProtocol.on("message", this._onChatMessage);
    chatProtocol.on("close", this._onChatClose);
    exploreProtocol.on("message", this._onExploreEvent);
  }

  componentDidMount() {
    playerStore.addChangeListener(this._onChange);
  }

  componentWillUnmount() {
    chatProtocol.removeListener("message", this._onChatMessage);
    chatProtocol.removeListener("close", this._onChatClose);
    exploreProtocol.removeListener("message", this._onExploreEvent);
  }

  componentDidUnmount() {
    playerStore.removeChangeListener(this._onChange);
  }

  addMessage(message) {
    message.id = nextMonotonicId();

    var parts = message.text.split(" ");
    console.log(parts);
    if (parts[0] == "/me") {
      message = {
          origin: null,
          text: " * " + message.origin + " " + parts.slice(1).join(" ")
      };
    }

    this.setState({
        messages: this.state.messages.concat([message])
    });
  }

  _onChatMessage(message) {
    if (message.origin === this.state.player.creature.name) {
      return;
    }

    this.addMessage(message);
  }

  _onExploreEvent(event) {
    switch (event.action) {
      case "enter":
        this.addMessage({
            origin: null,
            text: event.creature.name + " arrived."
        });
        break;

      case "leave":
        this.addMessage({
            origin: null,
            text: event.creature.name + " left."
        });
        break;
    }
  }

  _onChatClose() {
    this.addMessage({
        origin: null,
        text: "Connection lost."
    });
  }

  render() {
    function highlightColor(name) {
      return [].reduce.call(name, (acc, x) => acc + x.charCodeAt(0), 0) % 7 + 1;
    }

    var messages = this.state.messages.map(function (message) {
      return message.origin === null ?
        <tr key={message.id}>
          <td className="info" colSpan="2">{message.text}</td>
        </tr> :
        <tr key={message.id}>
          <th className={"highlight-" + highlightColor(message.origin)}>{message.origin}</th>
          <td>{message.text}</td>
        </tr>;
    }.bind(this));

    return <form className="row chat" onSubmit={this.onSubmit}>
      <div className="backlog">
        <table>{messages}</table>
      </div>
      <input className="message" placeholder="Chat message"
             onChange={this.onMessageChange} value={this.state.message} />
    </form>;
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.messages.length === this.state.messages.length) {
      return;
    }

    var node = this.getDOMNode().querySelector(".backlog");
    node.scrollTop = node.scrollHeight;
  }

  onSubmit(e) {
    e.preventDefault();
    var text = this.state.message;

    if (text.length === 0) {
      return;
    }

    chatProtocol.send({
        target: "#global",
        text: text
    });

    this.setState({
        message: ""
    });

    this.addMessage({
        origin: this.state.player.creature.name,
        text: text
    })
  }

  onMessageChange(e) {
    this.setState({
        message: e.target.value
    });
  }
}
var Chat = React.createClass(_Chat.prototype);
export default = Chat;
