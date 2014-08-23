/** @jsx React.DOM */

module React from "react";

module packets from "client/protos/packets";
module colors from "client/util/colors";
module objects from "client/util/objects";

var COMMANDS = {
  debug: (comp, game) => {
    game.setDebug(!game.debug);

    comp.addMessage(comp.makeInfoMessageNode(
        "Debug mode " + (game.debug ? "on" : "off") + "."));
  },

  deval: (comp, game, cmd) => {
    var r;
    var evalOk = false;
    try {
      r = eval(cmd);
      evalOk = true;
    } catch (e) {
      comp.addMessage(<pre className="info">&lt;&lt;! {e.toString()}</pre>);
    }

    if (evalOk) {
      comp.addMessage(<pre className="info">&lt;&lt;&lt; {objects.repr(r)}</pre>);
    }
  },

  ping: (comp, game) => {
    game.protocol.send(new packets.EchoPacket({
        payload: new Date().valueOf().toString()}));
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
    this.props.game.protocol.on(packets.Packet.Type.STATUS, this.onStatus);
    this.props.game.protocol.on(packets.Packet.Type.CHAT, this.onChat);
    this.props.game.protocol.on(packets.Packet.Type.INVENTORY, this.onInventory);
    this.props.game.protocol.on(packets.Packet.Type.ECHO, this.onEcho);
  },

  componentWillUnmount: function () {
    this.props.game.protocol.removeListener(packets.Packet.Type.STATUS, this.onStatus);
    this.props.game.protocol.removeListener(packets.Packet.Type.CHAT, this.onChat);
    this.props.game.protocol.removeListener(packets.Packet.Type.INVENTORY, this.onInventory);
    this.props.game.protocol.removeListener(packets.Packet.Type.ECHO, this.onEcho);
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

    this.addMessage(this.makeStatusMessageNode(
        entity.name, (message.online ? "connected" : "disconnected") + "."));
  },

  onChat: function (origin, message) {
    this.addMessage(this.makeChatMessageNode(
        message.actorName, message.text));
  },

  onInventory: function (origin, message) {
    this.addMessage(this.makeInfoMessageNode("You picked up: " +
        message.item.type));
  },

  onEcho: function (origin, message) {
    var startTime = parseFloat(message.payload);
    var endTime = new Date().valueOf();

    this.addMessage(this.makeInfoMessageNode(
        "Latency: " + (endTime - startTime) + "ms"));
  },

  addMessage: function (node) {
    this.setState({
        messages: this.state.messages.concat([{
            id: new Date().valueOf(),
            node: node
        }])
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

      if (!objects.hasOwnProp.call(COMMANDS, commandName)) {
        this.addMessage(this.makeInfoMessageNode("No such command: " +
            commandName));
      } else {
        COMMANDS[commandName](this, this.props.game, rest);
      }
    } else {
      pendingMessage = pendingMessage.replace(/^\/\//, "/");

      this.addMessage(this.makeChatMessageNode(
          this.props.game.me.name, pendingMessage));

      this.props.game.protocol.send(new packets.ChatPacket({
          target: "chatroom.global",
          text: pendingMessage
      }));
    }
  },

  makeOriginNode: function (origin) {
    return <span className="origin" style={{color: colors.makeColorForString(origin)}}>
      {origin}
    </span>;
  },

  makeChatMessageNode: function (origin, text) {
    return <div className="chat">
      {this.makeOriginNode(origin)} {text}
    </div>;
  },

  makeStatusMessageNode: function (origin, text) {
    return <div className="status">
      {this.makeOriginNode(origin)} {text}
    </div>;
  },

  makeInfoMessageNode: function (text) {
    return <div className="info">{text}</div>;
  },

  render: function () {
    var messages = this.state.messages.map((message) =>
        <li key={message.id}>{message.node}</li>);

    return <form className="log" onSubmit={this.handleSubmit}>
      <ul className="messages">
        {messages}
      </ul>
      <input type="text" onChange={this.onChange}
             value={this.state.pendingMessage}
             placeholder="Chat message" />
    </form>;
  }
});
