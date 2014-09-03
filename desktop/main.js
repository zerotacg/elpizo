var app = require("app");
var BrowserWindow = require("browser-window");
var Menu = require("menu");
var querystring = require("querystring");
var readline = require("readline");

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var URL = "http://localhost:8081/";
var APPLICATION_MENU = [{
    label: "Rekindled Hope",
    submenu: [{
        label: "Quit",
        accelerator: "Command+Q",
        click: function() {
          app.quit();
        }
    }]
}];

app.on("ready", function() {
  rl.question("Authorization token: ", function (token) {
    Menu.setApplicationMenu(Menu.buildFromTemplate(APPLICATION_MENU));

    var mainWindow = new BrowserWindow({
        title: "Rekindled Hope",
        width: 1280,
        height: 720
    });

    mainWindow.loadUrl(URL + "?" + querystring.stringify({
        token: token
    }));
  });
});
