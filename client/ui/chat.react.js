/** @jsx React.DOM */

module React from "react";
import {Packet, ChatPacket} from "../game_pb2";
import {makeColorForString} from "../util/colors";

export var Chat = React.createClass({
  getInitialState: function () {
    return {
        pendingMessage: "",
        messages: []
    };
  },

  componentWillMount: function () {
    this.props.game.protocol.on(Packet.Type.STATUS, this.onStatus);
    this.props.game.protocol.on(Packet.Type.CHAT, this.onChat);
    this.props.game.protocol.on(Packet.Type.INVENTORY, this.onInventory);
  },

  componentWillUnmount: function () {
    this.props.game.protocol.removeListener(Packet.Type.STATUS, this.onStatus);
    this.props.game.protocol.removeListener(Packet.Type.CHAT, this.onChat);
    this.props.game.protocol.removeListener(Packet.Type.INVENTORY, this.onInventory);
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (prevState.messages.length === this.state.messages.length) {
      return;
    }

    var node = this.getDOMNode().querySelector(".messages");
    node.scrollTop = node.scrollHeight;
  },

  onStatus: function (origin, message) {
    var entity = this.props.game.realm.getEntity(origin);

    this.addMessage({
        origin: entity.name,
        text: (message.online ? "connected" : "disconnected") + ".",
        isStatus: true
    });
  },

  onChat: function (origin, message) {
    this.addMessage({
        origin: message.actorName,
        text: message.text,
        isStatus: false
    });
  },

  onInventory: function (origin, message) {
    this.addMessage({
        origin: null,
        text: "You picked up: " + message.item.type
    });
  },

  addMessage: function (message) {
    message.id = new Date().valueOf(),
    this.setState({
        messages: this.state.messages.concat([message])
    });
  },

  onChange: function (e) {
    this.setState({pendingMessage: e.target.value});
  },

  handleSubmit: function (e) {
    e.preventDefault();
    var pendingMessage = this.state.pendingMessage;
    this.setState({pendingMessage: ""});

    if (pendingMessage.trim().length > 0) {
      this.addMessage({
          origin: this.props.game.me.name,
          text: pendingMessage,
          isStatus: false
      });

      this.props.game.protocol.send(new ChatPacket({
          target: "chatroom.global",
          text: pendingMessage
      }));
    }

    this.getDOMNode().querySelector("input").blur();
  },

  render: function () {
    var messages = this.state.messages.map((message) => {
      var maybeOrigin = message.origin &&
          <span className="origin" style={{color: makeColorForString(message.origin)}}>
              {message.origin}
          </span>;

      return <li key={message.id} className={message.isStatus ? "status" : ""}>
        {maybeOrigin} <span>{message.text}</span>
      </li>;
    });

    return <form className="chat" onSubmit={this.handleSubmit}>
      <ul className="messages">
        {messages}
      </ul>
      <input type="text" onChange={this.onChange}
             value={this.state.pendingMessage}
             placeholder="Chat message" />
    </form>;
  }
});
