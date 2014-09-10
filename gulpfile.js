"use strict";

var gulp = require("gulp");

var autoprefixer = require('autoprefixer-core');
var buffer = require("gulp-buffer");
var child_process = require("child_process");
var browserify = require("browserify");
var debowerify = require("debowerify");
var duration = require("gulp-duration")
var fs = require("fs");
var gutil = require("gulp-util");
var insert = require("gulp-insert");
var jstransform = require("jstransform");
var less = require("gulp-less");
var mochaPhantomJS = require("gulp-mocha-phantomjs");
var moduleVisitors = require("es6-module-jstransform/visitors");
var path = require("path");
var postcss = require("gulp-postcss");
var preprocessify = require("preprocessify");
var reactVisitors = require("react-tools/vendor/fbtransform/visitors");
var rename = require("gulp-rename");
var run = require("gulp-run");
var source = require("vinyl-source-stream");
var sourcemaps = require("gulp-sourcemaps");
var uglify = require("gulp-uglify");
var watchify = require("watchify");
var through = require("through");
var through2 = require("through2");
var tmp = require("tmp");
var walk = require("fs-walk");
var argv = require("yargs").argv;

var DEBUG = process.env.NODE_ENV === "development";

var paths = {
  scripts: ["client/**/*.js"],
  assets: ["assets/**/*"],
  styles: ["client/style/**/*.less"],
  protos: ["protos/*.proto"]
};

function reactify(filename) {
  var data = "";

  function inlineSourceMap(sourceMap, sourceCode, sourceFilename) {
    var json = sourceMap.toJSON();
    json.sources = [sourceFilename];
    json.sourcesContent = [sourceCode];
    var base64 = Buffer(JSON.stringify(json)).toString("base64");
    return "//# sourceMappingURL=data:application/json;base64," + base64;
  }

  function write(buf) {
    data += buf;
  }

  function end() {
    var visitors = moduleVisitors.visitorList.concat(
        reactVisitors.getAllVisitors());

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
      gutil.log(gutil.colors.red(e.toString() + " in file " + filename));
    }

    this.queue(result);
    this.queue(null);
  }

  return through(write, end);
}

function progress(filename) {
  gutil.log("Bundling", gutil.colors.magenta(filename));

  var data = "";

  function write(buf) {
    data += buf;
  }

  function end() {
    this.queue(data);
    this.queue(null);
  }

  return through(write, end);
}

function configureBundler(bundler) {
  var defines = {};
  if (DEBUG) {
    defines.DEBUG = true;
  }

  return bundler({
      paths: ["."]
  })
    .transform(progress)
    .transform(preprocessify(defines))
    .transform(reactify)
    .transform(debowerify);
}

function rebundle(bundler, filename) {
  return bundler.bundle({
        // We always want to emit source maps here, because sourcemaps.init will
        // take care of it for us later.
        debug: true
    })
    .on("error", function(e) {
      gutil.log(gutil.colors.red(e.toString()));
      this.emit("end");
    })
    .pipe(source(filename))
    .pipe(buffer())
    .pipe(duration("Bundle time"))
    .pipe(sourcemaps.init({
        loadMaps: true,
    }))
    .pipe(DEBUG ? through() : uglify())
    .pipe(sourcemaps.write("../maps"))
    .pipe(gulp.dest("static/js"));
}

gulp.task("scripts", ["protos"], function () {
  return rebundle(configureBundler(browserify).require("client/main", {
      entry: true
  }), "bundle.js");
});

gulp.task("test", function () {
  var tests = [];
  if (!argv.test) {
    // Do test discovery.
    walk.walkSync("./client", function (basedir, filename, stat) {
      if (filename.match(/^.*Test\.js$/)) {
        tests.push(path.join(basedir, filename));
      }
    });
  } else {
    tests = [].concat(argv.test);
  }

  return tmp.file(function (err, path, fd) {
    tests.forEach(function (testFile) {
      fs.writeSync(fd, "describe(" + JSON.stringify(testFile) + ", () => {" +
        "import " + JSON.stringify(testFile) + ";" +
      "});");
    });

    return rebundle(configureBundler(browserify).require(
        path, {
            entry: true
        }),
        "test.js").on("end", function () {
      return gulp.src("./client/tests/runner.html").pipe(mochaPhantomJS());
    });
  });
});

gulp.task("styles", function () {
  return gulp.src("./client/style/main.less")
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
    .pipe(postcss([autoprefixer]))
    .pipe(gulp.dest("static/css"));
});

gulp.task("protos", ["protos-js"]);

gulp.task("protos-js", function () {
  return gulp.src(paths.protos)
    .pipe(run(path.join(__dirname, "node_modules", ".bin", "proto2js") +
                        " ./protos/<%= file.relative %> -commonjs",
              {silent: true}))
    .pipe(insert.prepend(
        "require(\"protobufjs\").convertFieldsToCamelCase=true;"))
    .pipe(buffer()) // prevents slow writes from interfering
    .pipe(rename(function (file) {
      file.extname = ".js";
    }))
    .pipe(gulp.dest("client/protos"));
});

gulp.task("watchScripts", ["protos"], function () {
  gulp.watch(paths.protos, ["protos"]);

  var bundler = configureBundler(watchify).require("client/main", {
      entry: true
  });

  bundler.on("update", function (files) {
    gutil.log("Files updated, rebundling...", files);
    rebundle(bundler, "bundle.js")
        .on("finish", function () {
          gutil.log("Finished rebundling.");
        });
  });
  return rebundle(bundler, "bundle.js");
});

function generateManifest() {
  var manifest = {};
  var firstFile = null;

  return through2.obj(function (file, enc, cb) {
    if (firstFile === null) {
      firstFile = file;
    }

    var fileName = path.relative("assets", file.relative);

    switch (path.extname(file.relative)) {
      case ".png":
        manifest[fileName] = "image";
        break;
      case ".opus":
        manifest[fileName] = "audio";
        break;
    }

    if (Object.prototype.hasOwnProperty.call(manifest, fileName)) {
      this.push(file);
    }

    cb();
  }, function (cb) {
    this.push(new gutil.File({
        cwd: firstFile.cwd,
        base: firstFile.base,
        path: path.join(firstFile.base, "manifest.js"),
        contents: new Buffer("window._manifest=" +
                             JSON.stringify(manifest, null, ""))
    }));
    cb();
  });
}

gulp.task("assets", function () {
  return gulp.src("./assets/**/*", { base: "./" })
      .pipe(generateManifest())
      .pipe(gulp.dest("static"));
});

gulp.task("watch", function () {
  gulp.watch(paths.assets, ["assets"]);
  gulp.watch(paths.styles, ["styles"]);
  gulp.start("watchScripts");
});

gulp.task("build", [
    "assets",
    "styles",
    "watch"
]);

gulp.task("run", ["build"], function (cb) {
  var args = ["-m", "elpizo.server"];

  if (DEBUG) {
    args.push("--debug");
  }

  child_process.spawn("python3", args, {stdio: "inherit"}, function(err) {
    cb(err);
  });
});

gulp.task("default", ["run"]);
