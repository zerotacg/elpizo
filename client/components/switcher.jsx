/** @jsx React.DOM */

module React from "react";

import {classSet} from "../util/react";

class _Sidebar {
  render() {
    var tabs = this.props.tabs.map((tab) => {
      var classes = {
        active: this.props.activeTab === tab.id
      };

      return <li className={classSet(classes)} key={tab.id} data-caption={tab.name}>
        <a id={"sidebar-" + tab.id} href="#"
           onClick={this.onClick.bind(this, tab.id)}></a>
      </li>;
    });

    return <ul className="sidebar">{tabs}</ul>;
  }

  onClick(id) {
    this.props.onTabClick(id);
  }
}
var Sidebar = React.createClass(_Sidebar.prototype);

class _Switcher {
  getInitialState() {
    return {
      activeTab: this.props.tabs[0].id
    };
  }

  render() {
    var tabs = this.props.tabs.map(function (tab) {
      var classes = {
        tab: true,
        active: this.state.activeTab === tab.id
      };

      return <div className={classSet(classes)} key={tab.id}>
        {tab.element}
      </div>;
    }.bind(this));

    return <div className="switcher">
      <Sidebar tabs={this.props.tabs}
               activeTab={this.state.activeTab}
               onTabClick={this.handleSidebarTabClick} />
      {tabs}
    </div>;
  }

  handleSidebarTabClick(itemId) {
    this.setState({activeTab: itemId});
  }
}
var Switcher = React.createClass(_Switcher.prototype);

export default = Switcher;
