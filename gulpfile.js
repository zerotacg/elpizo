"use strict";

var gulp = require("gulp");

var buffer = require("gulp-buffer");
var browserify = require("browserify");
var debowerify = require("debowerify");
var duration = require("gulp-duration")
var gutil = require("gulp-util");
var insert = require("gulp-insert");
var jstransform = require("jstransform");
var less = require("gulp-less");
var moduleVisitors = require("es6-module-jstransform/visitors");
var path = require("path");
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
var argv = require("yargs").argv;

var paths = {
  scripts: ["client/**/*.js", "client/**/*.jsx"],
  assets: ["assets/**/*"],
  styles: ["client/style/**/*.less"],
  protos: ["proto/game.proto"]
};

function rebundle(bundler) {
  return bundler.bundle({
        // We always want to emit source maps here, because sourcemaps.init will
        // take care of it for us later.
        debug: true
    })
    .on("error", function(e) {
      gutil.log(gutil.colors.red(e.toString()));
      this.emit("end");
    })
    .pipe(source("bundle.js"))
    .pipe(buffer())
    .pipe(duration("Bundle time"))
    .pipe(sourcemaps.init({
        loadMaps: true,
    }))
    .pipe(argv.debug ? through() : uglify())
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
  return bundler
    .transform(progress)
    .transform(reactify)
    .transform(debowerify)
    .require("./client/main.jsx", {
        entry: true
    });
}

gulp.task("scripts", function () {
  return rebundle(configureBundler(browserify()));
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

gulp.task("protos", ["protos-js", "protos-py"]);

gulp.task("protos-js", function () {
  return gulp.src("./proto/game.proto")
    .pipe(run(path.join(__dirname, "node_modules", ".bin", "proto2js") +
                        " ./proto/game.proto -commonjs",
              {silent: true}))
    .pipe(insert.prepend("require(\"protobufjs\").convertFieldsToCamelCase=true;"))
    .pipe(rename("game_pb2.js"))
    .pipe(gulp.dest("client"));
});

gulp.task("protos-py", function (callback) {
  tmp.dir({prefix: "protoc"}, function (err, tmpdir) {
    gulp.src("./proto/game.proto")
      .pipe(run(path.join(__dirname, "protobuf-py3", "src", "protoc") +
        " -I=./proto --python_out=" + tmpdir + " ./proto/game.proto" +
        " && cat " + tmpdir + "/game_pb2.py", {silent: true}))
      .pipe(rename("game_pb2.py"))
      .pipe(gulp.dest("elpizo"))
      .on("end", callback);
  });
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
                             JSON.stringify(manifest, null, ''))
    }));
    cb();
  });
}

gulp.task("assets", function () {
  return gulp.src("./assets/**/*", { base: "./" })
      .pipe(generateManifest())
      .pipe(gulp.dest("elpizo/static"));
});

gulp.task("watch", function () {
  gulp.watch(paths.assets, ["assets"]);
  gulp.watch(paths.styles, ["styles"]);
  gulp.watch(paths.protos, ["protos"]);
  gulp.start("watchScripts");
});

gulp.task("default", [
  "watch",
  "watchScripts",
  "assets",
  "styles",
  "protos"
]);
