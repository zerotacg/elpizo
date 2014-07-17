(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var net = require("./net");

function httpJson(url, method, body) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.send(body ? JSON.stringify(body) : null)

    xhr.onload = function () {
      resolve(JSON.parse(xhr.responseText));
    };

    xhr.onerror = function (e) {
      reject(new Error(e));
    }
  });
}

function openProto(channel, transport) {
  return new net.Protocol(channel, transport);
}

module.exports = {
  getPlayer: httpJson.bind(null, "/player", "GET"),
  getExploreNearby: httpJson.bind(null, "/explore/nearby", "GET"),
  openExplore: openProto.bind(null, "explore"),
  openChat: openProto.bind(null, "chat")
};

},{"./net":7}],2:[function(require,module,exports){
/** @jsx React.DOM */"use strict";

var api = require("./api");

var Top = require("./top.jsx");
var Middle = require("./middle.jsx");
var Chat = require("./chat.jsx");

var ExploreTab = require("./tabs/explore.jsx");
var InventoryTab = require("./tabs/inventory.jsx");

var App = React.createClass({displayName: 'App',
  getInitialState: function () {
    return {
      player: {
        name: "???",
        playerKind: "unknown",
        playerLevel: -1,
        hp: -1,
        mp: -1,
        xp: -1,
        maxHp: -1,
        maxMp: -1,
        maxXp: -1
      }
    };
  },

  componentWillMount: function () {
    this.updateFromPlayer();
  },

  updateFromPlayer: function () {
    api.getPlayer().then(function (resp) {
      this.setState({
        player: {
          name: resp.name,
          kind: resp.kind,
          level: resp.level,
          hp: 50,
          mp: 50,
          xp: 50,
          maxHp: 100,
          maxMp: 100,
          maxXp: 100
        }
      });
    }.bind(this));
  },

  render: function () {
    var activeTab = this.state.activeTab;

    return React.DOM.div(null, 
      Top(this.state.player),

      Middle(
          {tabs:[
              {
                  id: "explore",
                  name: "Explore",
                  element: ExploreTab( {transport:this.props.transport} )
              },
              {
                  id: "inventory",
                  name: "Inventory",
                  element: InventoryTab(null )
              },
              {
                  id: "quests",
                  name: "Quests",
                  element: React.DOM.div(null)
              },
              {
                  id: "skills",
                  name: "Skills",
                  element: React.DOM.div(null)
              },
              {
                  id: "guild",
                  name: "Guild",
                  element: React.DOM.div(null)
              },
              {
                  id: "property",
                  name: "Property",
                  element: React.DOM.div(null)
              }
          ]} ),

      Chat( {playerName:this.state.player.name,
            transport:this.props.transport} )
    );
  },
});

module.exports = App;

},{"./api":1,"./chat.jsx":3,"./middle.jsx":6,"./tabs/explore.jsx":11,"./tabs/inventory.jsx":12,"./top.jsx":13}],3:[function(require,module,exports){
/** @jsx React.DOM */"use strict";

var api = require("./api");

var Chat = React.createClass({displayName: 'Chat',
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
        React.DOM.tr( {key:message.id}, React.DOM.td( {className:"info", colSpan:2}, message.text)) :
        React.DOM.tr( {key:message.id}, React.DOM.th(null, message.origin),React.DOM.td(null, message.text));
    }.bind(this));

    return React.DOM.form( {className:"row chat", onSubmit:this.onSubmit}, 
      React.DOM.div( {className:"col"}, 
        React.DOM.div( {className:"backlog well"}, 
          React.DOM.table(null, messages)
        ),
        React.DOM.input( {className:"message", placeholder:"Chat message",
               onChange:this.onMessageChange, value:this.state.message,
               disabled:this.state.ready ? "" : "disabled"} )
      )
    );
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

},{"./api":1}],4:[function(require,module,exports){
"use strict";

module.exports = {
  creature: {
    human: "Human",
    wyrm: "Wyrm"
  }
};

},{}],5:[function(require,module,exports){
/** @jsx React.DOM */"use strict";

var net = require("./net");

var App = require("./app.jsx");

React.renderComponent(
    App( {transport:new net.Transport("/events")} ),
    document.getElementById("elpizo"));

},{"./app.jsx":2,"./net":7}],6:[function(require,module,exports){
/** @jsx React.DOM */"use strict";

var Sidebar = React.createClass({displayName: 'Sidebar',
  render: function () {
    var tabs = this.props.tabs.map(function (item) {
      return React.DOM.li( {className:item.id === this.props.activeTab ? "active" : "",
                 id:"sidebar-" + item.id,
                 key:item.id}, 
        React.DOM.a( {onClick:this.onClick.bind(this, item.id), href:"#"}),
        React.DOM.div( {className:"tooltip"}, 
          React.DOM.div( {className:"name"}, item.name)
        )
      );
    }.bind(this));

    return React.DOM.ul( {className:"col sidebar"}, tabs);
  },

  onClick: function (id) {
    this.props.onTabClick(id);
  }
});

var Middle = React.createClass({displayName: 'Middle',
  getInitialState: function () {
    return {
      activeTab: "explore"
    };
  },

  render: function () {
    var tabs = this.props.tabs.map(function (tab) {
      return React.DOM.div( {className:"tab " + (this.state.activeTab == tab.id ?
                             "active" : "hidden"),
                  key:tab.id}, 
        tab.element
      );
    }.bind(this));

    return React.DOM.div( {className:"row middle"}, 
      Sidebar( {tabs:this.props.tabs,
               activeTab:this.state.activeTab,
               onTabClick:this.handleSidebarTabClick} ),
      React.DOM.div( {className:"col main"}, tabs)
    );
  },

  handleSidebarTabClick: function (itemId) {
    this.setState({activeTab: itemId});
  }
});

module.exports = Middle;

},{}],7:[function(require,module,exports){
"use strict";

var util = require("./util");

function Transport(host) {
  util.EventEmitter.call(this);

  this.host = host;
  this.connect();
  this.opened = false;

  this.socket.onclose = function (e) {
    console.warn("Socket died, reconnecting.");
    this.connect();
    this.opened = true;
    this.emit("close");
  }.bind(this);
}

Transport.prototype = new util.EventEmitter();

Transport.prototype.connect = function () {
  this.socket = new SockJS(this.host);

  this.socket.onopen = function (e) {
    this.opened = true;
    this.emit("open");
  }.bind(this);

  this.socket.onmessage = function (e) {
    var parts = e.data.split(":");
    var channel = parts[0];
    var message = JSON.parse(parts.slice(1).join(":"));
    this.emit("message", channel, message);
  }.bind(this);
};

Transport.prototype.send = function (channel, message) {
  this.socket.send([channel, JSON.stringify(message)].join(":"));
};

Transport.prototype.close = function () {
  this.socket.close();
}

function Protocol(channel, transport) {
  util.EventEmitter.call(this);

  this.channel = channel;
  this.transport = transport;

  if (this.transport.opened) {
    this.emit("open");
  }

  this.transport.on("message", function (channel, message) {
    if (channel === this.channel) {
      this.emit("message", message);
    }
  }.bind(this));

  this.transport.on("open", this.emit.bind(this, "open"));
  this.transport.on("close", this.emit.bind(this, "close"));
}

Protocol.prototype = new util.EventEmitter();

Protocol.prototype.send = function (message) {
  this.transport.send(this.channel, message);
};

module.exports = {
  Transport: Transport,
  Protocol: Protocol
};

},{"./util":14}],8:[function(require,module,exports){
/** @jsx React.DOM */"use strict;"

var Icon = React.createClass({displayName: 'Icon',
  render: function () {
    return React.DOM.div( {className:"taxonomy-" + this.props.taxonomy + " " +
                           "kind-" + this.props.kind + " " +
                           "variant-" + this.props.variant + " " +
                           this.props.size + " icon"});
  }
});

module.exports = Icon;

},{}],9:[function(require,module,exports){
/** @jsx React.DOM */"use strict;"

var Menu = require("./menu.jsx");

var util = require("../util");

var Square = React.createClass({displayName: 'Square',
  getInitialState: function () {
    return {
      active: false
    };
  },

  render: function () {
    return React.DOM.li( {className:this.state.active ? "active" : ""}, 
      React.DOM.div( {className:"square"}, 
        this.props.icon,
        React.DOM.div( {className:"tooltip"}, 
          React.DOM.div( {className:"name"}, 
            this.props.title, " ", React.DOM.small(null, this.props.subtitle)
          ),
          this.props.menu
        )
      )
    );
  },

  onClick: function () {
    this.setState({
      active: !this.state.active
    });
  }
});

var Card = React.createClass({displayName: 'Card',
  getInitialState: function () {
    return {
      active: false
    };
  },

  render: function () {
    return React.DOM.li( {className:this.state.active ? "active" : "",
               key:this.props.id}, 
      React.DOM.div( {className:"row card", onClick:this.onClick}, 
        React.DOM.div( {className:"col"}, 
          this.props.icon
        ),
        React.DOM.div( {className:"name col"}, 
          this.props.title, " ", React.DOM.small(null, this.props.subtitle)
        )
      ),
      React.DOM.div( {className:"row"}, 
        React.DOM.div( {className:"col full"}, 
          this.props.menu,
          Menu( {items:[
            {title: "Talk", subtitle: "", id: "talk"},
            {title: "Tame", subtitle: "Beastmastery 100", id: "tame"},
            {title: "Info", subtitle: "", id: "info"}
          ]} )
        )
      )
    );
  },

  onClick: function () {
    this.setState({active: !this.state.active});
  }
});

var List = React.createClass({displayName: 'List',
  getFactory: function () {
    switch (this.props.type) {
      case "card": return Card;
      case "square": return Square;
    }
   },

  render: function () {
    var ListItem = this.getFactory();

    var items = this.props.items.map(function (item) {
      return ListItem(util.extend({key: item.id}, item));
    });

    return React.DOM.ul( {className:"list"}, items);
  }
});

module.exports = List;

},{"../util":14,"./menu.jsx":10}],10:[function(require,module,exports){
/** @jsx React.DOM */"use strict";

var Menu = React.createClass({displayName: 'Menu',
  render: function () {
    var items = this.props.items.map(function (item) {
      return React.DOM.li( {key:item.id}, React.DOM.a( {href:"#",
                                  onClick:this.onClick.bind(this, item.id)}, 
        item.title, " ", React.DOM.small(null, item.subtitle))
      );
    }.bind(this));

    return React.DOM.ul( {className:"menu"}, items);
  },

  onClick: function (id) {
    this.props.onItemClick(id);
  }
});

module.exports = Menu;

},{}],11:[function(require,module,exports){
/** @jsx React.DOM */"use strict";

var api = require("../api");
var lexicon = require("../lexicon");

var Icon = require("../parts/icon.jsx");
var List = require("../parts/list.jsx");
var Menu = require("../parts/menu.jsx");

function showEntity(taxonomy, entity) {
  return {
      id: entity.id,
      title: entity.name,
      subtitle: lexicon[taxonomy][entity.kind] + " " + entity.level,
      icon: Icon( {taxonomy:taxonomy, kind:entity.kind, variant:"1", size:"big"} ),
      menu: Menu( {items:[
        {title: "Talk", subtitle: "", id: "talk"},
        {title: "Tame", subtitle: "Beastmastery 100", id: "tame"},
        {title: "Info", subtitle: "", id: "info"}
      ]} )
  };
}

var Explore = React.createClass({displayName: 'Explore',
  getInitialState: function () {
    return {
        name: "Unknown",
        x: -1,
        y: -1,
        realm: "The Ether",
        creatures: [],
        buildings: [],
        items: [],
        facilities: []
    };
  },

  componentWillMount: function () {
    this.updateFromNearby();
    this.explore = api.openExplore(this.props.transport);
  },

  updateFromNearby: function () {
    api.getExploreNearby().then(function (nearby) {
      this.setState({
          name: nearby.name,
          x: nearby.x,
          y: nearby.y,
          realm: nearby.realm,
          creatures: nearby.creatures.map(showEntity.bind(null, "creature")),
          buildings: nearby.buildings.map(showEntity.bind(null, "building")),
          items: nearby.items.map(showEntity.bind(null, "item")),
          facilities: nearby.facilities.map(showEntity.bind(null, "facility"))
      });
    }.bind(this));
  },

  render: function () {
    return React.DOM.div( {className:"explore"}, 
      React.DOM.div( {className:"row"}, 
        React.DOM.div( {className:"col primary"}, 
          React.DOM.div( {className:"map"})
        ),
        React.DOM.div( {className:"col secondary"}, 
          React.DOM.div( {className:"name"}, 
            this.state.name, " ", React.DOM.small(null, this.state.x,", ", this.state.y, " ", this.state.realm)
          ),

          React.DOM.div( {className:"row columns"}, 
            React.DOM.div( {className:"col"}, 
              React.DOM.div( {className:"well"}, 
                List( {type:"card", items:this.state.creatures} )
              )
            ),
            React.DOM.div( {className:"col"}, 
              React.DOM.div( {className:"well"}, 
                List( {type:"card", items:this.state.buildings} )
              )
            )
          ),

          React.DOM.div( {className:"row"}, 
            React.DOM.div( {className:"col"}, 
              React.DOM.div( {className:"well entities"}, 
                React.DOM.div( {className:"left"}, 
                  List( {type:"square", items:this.state.items} )
                ),

                React.DOM.div( {className:"right"}, 
                  List( {type:"square", items:this.state.facilities} )
                )
              )
            )
          )
        )
      )
    );
  }
});

module.exports = Explore;

},{"../api":1,"../lexicon":4,"../parts/icon.jsx":8,"../parts/list.jsx":9,"../parts/menu.jsx":10}],12:[function(require,module,exports){
/** @jsx React.DOM */"use strict";

var Inventory = React.createClass({displayName: 'Inventory',
  render: function () {
    return React.DOM.div( {className:"inventory"}, 
      "hello hello hello hello hello hello hello hello hello hello hello hello"+' '+
      "hello hello hello hello hello hello hello hello hello hello hello hello"+' '+
      "hello hello hello hello hello hello hello hello hello hello hello hello"+' '+
      "hello hello hello hello hello hello hello hello hello hello hello hello"+' '+
      "hello hello hello hello hello hello hello hello hello hello hello hello"+' '+
      "hello hello hello hello hello hello hello hello hello hello hello hello"+' '+
      "hello hello hello hello hello hello hello hello hello hello hello hello"+' '+
      "hello hello hello hello hello hello hello hello hello hello hello hello"+' '+
      "hello hello hello hello hello hello hello hello hello hello hello hello"
    );
  }
});

module.exports = Inventory;

},{}],13:[function(require,module,exports){
/** @jsx React.DOM */"use strict";

var lexicon = require("./lexicon");

var Icon = require("./parts/icon.jsx");

module.exports = React.createClass({displayName: 'exports',
  getInitialState: function () {
    return {time: "Time goes here"};
  },

  render: function () {
    return React.DOM.div( {className:"row top"}, 
      React.DOM.div( {className:"col"}, 
        React.DOM.div( {className:"left"}, 
          Icon( {taxonomy:"creature", kind:this.props.kind, variant:"1", size:"big"} )
        ),
        React.DOM.div( {className:"stats left"}, 
          React.DOM.div( {className:"name left"}, 
            this.props.name, " ", React.DOM.small(null, lexicon.creature[this.props.kind], " ", this.props.level)
          ),
          React.DOM.div( {className:"right"}, this.state.time),
          React.DOM.div( {className:"bars clear"}, 
            React.DOM.div( {className:"bar hp"}, 
              React.DOM.div( {className:"fill", style:{width: Math.round(this.props.hp / this.props.maxHp * 100) + "%"}}),
              React.DOM.div( {className:"caption"}, this.props.hp, " / ", this.props.maxHp)
            ),
            React.DOM.div( {className:"bar mp"}, 
              React.DOM.div( {className:"fill", style:{width: Math.round(this.props.mp / this.props.maxMp * 100) + "%"}}),
              React.DOM.div( {className:"caption"}, this.props.mp, " / ", this.props.maxMp)
            ),
            React.DOM.div( {className:"bar xp"}, 
              React.DOM.div( {className:"fill", style:{width: Math.round(this.props.xp / this.props.maxXp * 100) + "%"}}),
              React.DOM.div( {className:"caption"}, this.props.xp, " / ", this.props.maxXp)
            )
          )
        )
      )
    );
  }
});

},{"./lexicon":4,"./parts/icon.jsx":8}],14:[function(require,module,exports){
"use strict";

var hasOwnProp = Object.prototype.hasOwnProperty;

function EventEmitter() {
  this._handlers = {};
}

EventEmitter.prototype._getHandlers = function (name) {
  var handlers = this._handlers[name] = this._handlers[name] || [];
  return handlers;
};

EventEmitter.prototype.on = function (name, handler) {
  this._getHandlers(name).push(handler);
};

EventEmitter.prototype.off = function (name, handler) {
  var handlers = this._getHandlers(name);
  var i = handlers.indexOf(handler);

  if (i !== -1) {
    handlers.splice(i, 1);
  }
};

EventEmitter.prototype.allOff = function (name) {
  delete this._handlers[name];
};

EventEmitter.prototype.emit = function (name) {
  var args = [].slice.call(arguments, 1);

  this._getHandlers(name).forEach(function (handler) {
    handler.apply(this, args);
  }.bind(this));
};

function extend(dest, src) {
  for (var k in src) {
    if (!hasOwnProp.call(src, k)) {
      continue;
    }

    dest[k] = src[k];
  }

  return dest;
}

module.exports = {
  EventEmitter: EventEmitter,
  extend: extend
};

},{}]},{},[5])