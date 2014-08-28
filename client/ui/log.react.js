/** @jsx React.DOM */

module React from "react";

module packets from "client/protos/packets";
module colors from "client/util/colors";
module objects from "client/util/objects";

var COMMANDS = {
  debug: (game) => {
    game.setDebug(!game.debug);

    game.appendToLog(InfoMessageEntry({
        text: "Debug mode " + (game.debug ? "on" : "off") + "."
    }));
  },

  deval: (game, cmd) => {
    var r;
    var evalOk = false;
    try {
      r = eval(cmd);
      evalOk = true;
    } catch (e) {
      game.appendToLog(<pre className="info">&lt;&lt;! {e.toString()}</pre>);
    }

    if (evalOk) {
      game.appendToLog(<pre className="info">&lt;&lt;&lt; {objects.repr(r)}</pre>);
    }
  },

  ping: (game) => {
    game.protocol.send(new packets.EchoPacket({
        payload: new Date().valueOf().toString()}));
  }
};

var Origin = React.createClass({
  render: function () {
    return <span className="origin" style={{color: colors.makeColorForString(this.props.origin)}}>
      {this.props.origin}
    </span>;
  }
});

export var ChatMessageEntry = React.createClass({
  render: function () {
    return <div className="chat">
      <Origin origin={this.props.origin} /> {this.props.text}
    </div>;
  }
});

export var StatusMessageEntry = React.createClass({
  render: function () {
    return <div className="status">
      <Origin origin={this.props.origin} /> {this.props.text}
    </div>;
  }
});

export var InfoMessageEntry = React.createClass({
  render: function () {
    return <div className="info">{this.props.text}</div>;
  }
});

export var Log = React.createClass({
  getInitialState: function () {
    return {
        pendingMessage: ""
    };
  },

  componentDidUpdate: function (prevProps, prevState) {
    if (prevProps.log.length === this.props.log.length) {
      return;
    }

    var node = this.getDOMNode().querySelector(".messages");
    node.scrollTop = node.scrollHeight;
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
        this.props.game.appendToLog(InfoMessageEntry({
          text: "No such command: " + commandName
        }))
      } else {
        COMMANDS[commandName](this.props.game, rest);
      }
    } else {
      pendingMessage = pendingMessage.replace(/^\/\//, "/");

      this.props.game.appendToLog(ChatMessageEntry({
          origin: this.props.game.me.name,
          text: pendingMessage
      }));

      this.props.game.protocol.send(new packets.ChatPacket({
          target: "chatroom.global",
          text: pendingMessage
      }));
    }
  },

  render: function () {
    var messages = this.props.log.map((entry) =>
        <li key={entry.id}>{entry.node}</li>);

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
