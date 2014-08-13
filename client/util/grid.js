export class Grid {
  constructor(w, h, xs) {
    this.xs = null;

    if (xs) {
      this.xs = [].slice.call(xs);
    }

    this.setSize(w || 0, h || 0);
  }

  setSize(w, h) {
    this.width = w;
    this.height = h;

    if (this.xs === null) {
      this.clear();
    }
  }

  clear() {
    this.xs = new Array(this.width * this.height);

    for (var i = 0; i < this.xs.length; ++i) {
      this.xs[i] = null;
    }
  }

  getRow(y) {
    var i = y * this.width;
    return this.xs.slice(i, i + this.width);
  }

  getColumn(x) {
    var column = [];
    for (var j = 0; j < this.width; ++j) {
      column.push(this.xs[j * this.width + x]);
    }
    return column;
  }

  getCell(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }

    return this.xs[y * this.width + x];
  }

  setRow(x, y, xs) {
    if (y < 0 || y >= this.height) {
      return;
    }

    if (x < 0) {
      xs = xs.slice(-x);
      x = 0;
    }

    var i = y * this.width + x;
    var w = Math.min(xs.length, Math.max(0, this.width - x));
    xs = xs.slice(0, w);
    [].splice.apply(this.xs, [i, w].concat(xs));
  }

  setColumn(x, y, xs) {
    var h = Math.min(xs.length, Math.max(0, this.height - y));

    for (var j = 0; j < h; ++j) {
      this.xs[(j + y) * this.width + x] = xs[j];
    }
  }

  setCell(x, y, c) {
    this.xs[y * this.width + x] = c;
  }

  forEachRow(f) {
    for (var i = 0; i < this.height; ++i) {
      f(this.getRow(i), i);
    }
  }

  setImage(x, y, w, h, xs) {
    xs.forEachRow(function (row, i) {
      var start = 0;

      // Set the image in groups of contiguous runs.
      while (start < row.length) {
        while (row[start] === " " && start <= row.length) {
          ++start;
        }

        var end = start;
        while (row[end] !== " " && end <= row.length) {
          ++end;
        }

        this.setRow(x + start, y + i, row.slice(start, end));

        start = end;
      }
    }.bind(this));
  }

  copy() {
    var grid = new Grid(this.width, this.height);
    grid.xs = this.xs.slice();
    return grid;
  }

  fill(x) {
    for (var i = 0; i < this.width * this.height; ++i) {
      this.xs[i] = x;
    }
  }

  crop(x, y, w, h) {
    var grid = new Grid(w, h);
    for (var i = 0; i < h; ++i) {
      grid.setRow(0, i, this.getRow(i + y).slice(x));
    }
    return grid;
  }
}
