/** @jsx React.DOM */

import {Transport} from "./net";

module React from "react";

module App from "./app.jsx";
React.renderComponent(<App
    transport={new Transport("/events")}
/>, document.getElementById("elpizo"));
