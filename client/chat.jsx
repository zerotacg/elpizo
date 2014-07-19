/** @jsx React.DOM */

module React from "react";

import {openChat} from "./api";

import {nextMonotonicId} from "./util/objects";

class _Chat {
  getInitialState() {
    return {
        message: "",
        messages: [],
        ready: false
    };
  }

  componentWillMount() {
    this.chat = openChat(this.props.transport);

    this.chat.on("open", this.onChatOpen);
    this.chat.on("message", this.onChatMessage);
    this.chat.on("close", this.onChatClose);
  }

  componentWillUnmount () {
    this.chat.off("open", this.onChatOpen);
    this.chat.off("message", this.onChatMessage);
    this.chat.off("close", this.onChatClose);
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
        ready: true
    });
  }

  onChatMessage(message) {
    if (message.origin === this.props.playerName) {
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
             disabled={this.state.ready ? "" : "disabled"} />
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

    this.chat.send({
        target: "#global",
        text: text
    });

    this.setState({
        message: ""
    });

    this.addMessage({
        origin: this.props.playerName,
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
