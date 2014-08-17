/** @jsx React.DOM */

module React from "react";
import {Packet, ChatPacket} from "../game_pb2";
import {makeColorForString} from "../util/colors";
import {hasOwnProp} from "../util/objects";

var COMMANDS = {
  debug: (comp, game) => {
    game.setDebug(!game.debug);

    comp.addMessage({
        origin: null,
        text: "Debug mode " + (game.debug ? "on" : "off") + ".",
        isStatus: true
    });
  },

  deval: (comp, game, cmd) => {
    comp.addMessage({
        origin: null,
        text: "Debug eval result: " + eval(cmd),
        isStatus: true
    });
  }
};

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
        text: "You picked up: " + message.item.type,
        isStatus: true
    });
  },

  addMessage: function (message) {
    message.id = new Date().valueOf();
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
    this.getDOMNode().querySelector("input").blur();

    if (pendingMessage.trim().length === 0) {
      return;
    }

    if (pendingMessage[0] === "/" && pendingMessage[1] !== "/") {
      var parts = pendingMessage.slice(1).split(/ /);
      var commandName = parts[0].trim().toLowerCase();
      var rest = parts.slice(1).join(" ").trim();

      if (!hasOwnProp.call(COMMANDS, commandName)) {
        this.addMessage({
            origin: null,
            text: "No such command: " + commandName,
            isStatus: true
        });
      } else {
        COMMANDS[commandName](this, this.props.game, rest);
      }
    } else {
      pendingMessage = pendingMessage.replace(/^\/\//, "/");

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
