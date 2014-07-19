"use strict";

var gulp = require("gulp");

var buffer = require("gulp-buffer");
var browserify = require("browserify");
var debowerify = require("debowerify");
var duration = require("gulp-duration")
var gutil = require("gulp-util");
var jstransform = require("jstransform");
var less = require("gulp-less");
var moduleVisitors = require("es6-module-jstransform/visitors");
var path = require("path");
var reactVisitors = require("react-tools/vendor/fbtransform/visitors");
var source = require("vinyl-source-stream");
var sourcemaps = require("gulp-sourcemaps");
//var uglify = require("gulp-uglify");
var watchify = require("watchify");
var through = require("through");

var paths = {
  scripts: ["client/**/*.js", "client/**/*.jsx"],
  styles: ["client/style/**/*.less"]
};

function rebundle(bundler) {
  return bundler.bundle({
        // We always want to emit source maps here, because sourcemaps.init will
        // take care of it for us later.
        debug: true
    })
    .on("error", function(e) {
      e.toString().split("\n").forEach(function (line) {
        gutil.log(gutil.colors.red(line));
      });
      this.emit("end");
    })
    .pipe(source("bundle.js"))
    .pipe(buffer())
    .pipe(duration("Bundle time"))
    .pipe(sourcemaps.init({
        loadMaps: true,
    }))
    //.pipe(uglify())
    .pipe(sourcemaps.write("../maps"))
    .pipe(gulp.dest("elpizo/static/js"));
}

function reactify(filename) {
  var data = "";

  function inlineSourceMap(sourceMap, sourceCode, sourceFilename) {
    var json = sourceMap.toJSON();
    json.sources = [sourceFilename];
    json.sourcesContent = [sourceCode];
    var base64 = Buffer(JSON.stringify(json)).toString("base64");
    return "//# sourceMappingURL=data:application/json;base64," +
           base64;
  }

  function write(buf) {
    data += buf;
  }

  function end() {
    var visitors = moduleVisitors.visitorList.concat(reactVisitors.getAllVisitors());
    var options = {
        sourceMap: true
    };

    var result;
    try {
      var output = jstransform.transform(visitors, data, options);
      result = output.code + "\n" + inlineSourceMap(
          output.sourceMap, data, output.sourceFilename);
    } catch (e) {
      result = data;
    }

    this.queue(result);
    this.queue(null);
  }

  return through(write, end);
}

function configureBundler(bundler) {
  return bundler
    .transform(reactify)
    .transform(debowerify)
    .require("./client/main.jsx", {
        entry: true
    });
}

gulp.task("scripts", function () {
  return rebundle(configureBundler(browserify));
});

gulp.task("styles", function () {
  return gulp.src("./client/style/main.less")
    .pipe(sourcemaps.init())
    .pipe(less({
        paths: [path.join(__dirname, "client", "style")],
        compress: true
    }))
    .on("error", function (e) {
      e.toString().split("\n").forEach(function (line) {
        gutil.log(gutil.colors.red(line));
      });
      this.emit("end");
    })
    .pipe(sourcemaps.write("../maps"))
    .pipe(gulp.dest("elpizo/static/css"));
});

gulp.task("watchScripts", function () {
  var bundler = configureBundler(watchify());
  bundler.on("update", function (files) {
    gutil.log("Files updated, rebundling...", files);
    rebundle(bundler)
        .on("finish", function () {
          gutil.log("Finished rebundling.");
        });
  });
  return rebundle(bundler);
});

gulp.task("watch", function () {
  gulp.start("watchScripts")
  gulp.watch(paths.styles, ["styles"]);
});

gulp.task("default", ["watch", "watchScripts", "styles"]);
