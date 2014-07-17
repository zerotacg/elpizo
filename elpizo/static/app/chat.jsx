"use strict";

var api = require("./api");

var Chat = React.createClass({
  getInitialState: function () {
    return {
      message: "",
      messages: [],
      ready: false
    };
  },

  componentWillMount: function () {
    this.chat = api.openChat(this.props.transport);

    this.chat.on("open", this.onChatOpen);
    this.chat.on("message", this.onChatMessage);
    this.chat.on("close", this.onChatClose);
  },

  statics: {
    nextMonotonicId: (function () {
      var id = 0;

      return function () {
        var i = id;
        ++id;
        return "backlog-" + i;
      }
    })()
  },

  componentWillUnmount: function () {
    this.chat.allOff("open")
    this.chat.allOff("message");
    this.chat.allOff("close")
    this.chat.close();
  },

  addMessage: function (message) {
    message.id = Chat.nextMonotonicId();

    this.setState({
      messages: this.state.messages.concat([message])
    });
  },

  onChatOpen: function () {
    this.addMessage({
      origin: null,
      text: "Chat connection established."
    });
    this.setState({ready: true});
  },

  onChatMessage: function (message) {
    if (message.origin === this.props.playerName) {
      return;
    }

    this.addMessage(message);
  },

  onChatClose: function () {
    this.addMessage({
      origin: null,
      text: "Chat connection lost."
    });
    this.setState({ready: false});
  },

  render: function () {
    var messages = this.state.messages.map(function (message) {
      return message.origin === null ?
        <tr key={message.id}><td className="info" colSpan={2}>{message.text}</td></tr> :
        <tr key={message.id}><th>{message.origin}</th><td>{message.text}</td></tr>;
    }.bind(this));

    return <form className="row chat" onSubmit={this.onSubmit}>
      <div className="col">
        <div className="backlog well">
          <table>{messages}</table>
        </div>
        <input className="message" placeholder="Chat message"
               onChange={this.onMessageChange} value={this.state.message}
               disabled={this.state.ready ? "" : "disabled"} />
      </div>
    </form>;
  },

  componentDidUpdate: function(prevProps, prevState) {
    if (prevState.messages.length === this.state.messages.length) {
      return;
    }

    var node = this.getDOMNode().querySelector(".backlog");
    node.scrollTop = node.scrollHeight;
  },

  onSubmit: function (e) {
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
  },

  onMessageChange: function (e) {
    this.setState({
      message: e.target.value
    });
  }
});

module.exports = Chat;
