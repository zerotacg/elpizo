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
