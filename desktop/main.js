var app = require("app");
var BrowserWindow = require("browser-window");
var Menu = require("menu");

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
  Menu.setApplicationMenu(Menu.buildFromTemplate(APPLICATION_MENU));

  var window = new BrowserWindow({
      title: "Rekindled Hope",
      width: 1280,
      height: 720
  });

  window.loadUrl("file://" + __dirname + "/index.html");

  window.webContents.on("did-finish-load", function () {
    if (process.argv.length > 2) {
      window.webContents.send("token", process.argv[2]);
    }
  });
});
