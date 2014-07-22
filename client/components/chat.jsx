/** @jsx React.DOM */

module React from "react";

import {openChat} from "../api";

import {nextMonotonicId} from "../util/objects";

module playerStore from "../stores/player";
module playerActions from "../actions/player";

class _Chat {
  getInitialState() {
    return {
        message: "",
        messages: [],
        ready: false,
        player: playerStore.get()
    };
  }

  _onChange() {
    var player = playerStore.get();
    this.setState({
        player: player,
        ready: this.chatProtocol.transport.opened && player !== null
    });
  }

  componentWillMount() {
    playerActions.fetch();

    this.chatProtocol = openChat();

    this.chatProtocol.on("open", this.onChatOpen);
    this.chatProtocol.on("message", this.onChatMessage);
    this.chatProtocol.on("close", this.onChatClose);
  }

  componentDidMount() {
    playerStore.addChangeListener(this._onChange);
  }

  componentWillUnmount() {
    this.chatProtocol.removeListener("open", this.onChatOpen);
    this.chatProtocol.removeListener("message", this.onChatMessage);
    this.chatProtocol.removeListener("close", this.onChatClose);
  }

  componentDidUnmount() {
    playerStore.removeChangeListener(this._onChange);
  }

  addMessage(message) {
    message.id = nextMonotonicId();

    this.setState({
        messages: this.state.messages.concat([message])
    });
  }

  onChatOpen() {
    this.addMessage({
        origin: null,
        text: "Connection established."
    });
    this.setState({
        ready: this.state.player !== null
    });
  }

  onChatMessage(message) {
    if (message.origin === this.state.player.creature.name) {
      return;
    }

    this.addMessage(message);
  }

  onChatClose() {
    this.addMessage({
        origin: null,
        text: "Connection lost."
    });
    this.setState({
        ready: false
    });
  }

  render() {
    var messages = this.state.messages.map(function (message) {
      return message.origin === null ?
        <tr key={message.id}><td className="info" colSpan="2">{message.text}</td></tr> :
        <tr key={message.id}><th>{message.origin}</th><td>{message.text}</td></tr>;
    }.bind(this));

    return <form className="row chat" onSubmit={this.onSubmit}>
      <div className="backlog">
        <table>{messages}</table>
      </div>
      <input className="message" placeholder="Chat message"
             onChange={this.onMessageChange} value={this.state.message}
             disabled={!this.state.ready} />
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

    this.chatProtocol.send({
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
