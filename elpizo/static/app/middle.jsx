"use strict";

var Sidebar = React.createClass({
  render: function () {
    var tabs = this.props.tabs.map(function (item) {
      return <li className={item.id === this.props.activeTab ? "active" : ""}
                 id={"sidebar-" + item.id}
                 key={item.id}>
        <a onClick={this.onClick.bind(this, item.id)} href="#"></a>
        <div className="tooltip">
          <div className="name">{item.name}</div>
        </div>
      </li>;
    }.bind(this));

    return <ul className="col sidebar">{tabs}</ul>;
  },

  onClick: function (id) {
    this.props.onTabClick(id);
  }
});

var Middle = React.createClass({
  getInitialState: function () {
    return {
      activeTab: "explore"
    };
  },

  render: function () {
    var tabs = this.props.tabs.map(function (tab) {
      return <div className={"tab " + (this.state.activeTab == tab.id ?
                             "active" : "hidden")}
                  key={tab.id}>
        {tab.element}
      </div>;
    }.bind(this));

    return <div className="row middle">
      <Sidebar tabs={this.props.tabs}
               activeTab={this.state.activeTab}
               onTabClick={this.handleSidebarTabClick} />
      <div className="col main">{tabs}</div>
    </div>;
  },

  handleSidebarTabClick: function (itemId) {
    this.setState({activeTab: itemId});
  }
});

module.exports = Middle;
