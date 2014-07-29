Concepts
========

Realms
------
Realms are disconnected maps that players can travel within. They are associated
with a set of terrain tables, which are used to represent the base map for a
realm. The terrain tables store corners and tiles as arrays as two columns per
region, indexed by absolute region space. This is a denormalized design which
trades off efficiency for data consistency (arguably, this is the antipattern
known as "jaywalking") -- however, it is unlikely that individual corners will
ever need to be queried in a relational manner.

Tiles
~~~~~
Tiles are the locations where entities (buildings, actors, etc.) can be placed
in a realm. Tiles contain no terrain information and is inferred strictly from
the corners-in-regions table (i.e. they don't actually exist physically). The
tiles are computed on the client side.

Pathing
+++++++
Pathing is computed only in straight lines -- there is no intelligent
pathfinding (e.g. A*). A straight line is drawn from the origin point to the
destination via a 4-connected variant of Bresenham's algorithm, which will
construct a path as a series of directional single-tile steps. Impassable
terrain is checked for along the path -- a tile is impassable if more than two
corner terrains are impassable. The paths are computed on the client side and
sent to the server -- the path is verified first by the client, and the server
can choose to reject it if it is invalid.

::

    def compute_path(x0, y0, x1, y1):
      path = []

      dx = abs(x1 - x0)
      dy = abs(y1 - y0)

      ix = 1 if x0 < x1 else -1
      iy = 1 if y0 < y1 else -1

      e = 0

      for i in range(dx + dy):
        e1 = e + dy
        e2 = e - dx

        if abs(e1) < abs(e2):
          x0 += ix
          e = e1
          step = (ix, 0)
        else:
          y0 += iy
          e = e2
          step = (0, iy)

        path.append(step)

      return path

Corners
~~~~~~~
Corners are the dual of tiles and contain terrain information about the corners
of tiles. This is such that the Marching Squares algorithm can deduce what
transitions occur on a specific tile by interpolating from tile corners. Tile
terrains can always be inferred from their corners.

Tile corners may be duplicated at region boundaries (17 x 4 in total) -- this is
such that tiles for a single region can always be computed from a single row
from the region table. Care must be taken to ensure region boundary tile corners
are consistent with each other.

Marching Squares
++++++++++++++++
A strict precedence of terrain types is determined beforehand, e.g. ocean <
beach < grass < river < lake.

In parallel, each tile is mapped over to find the tile's four corners. Then, the
terrains of the four corners are independently sorted in order of precedence,
and the following is computed for each terrain type in order::

  m = (corner_nw in A) << 3 |
      (corner_ne in A) << 2 |
      (corner_se in A) << 1 |
      (corner_sw in A) << 0

The resulting value, ``m``, is the *mask value* and is located in a lookup table
to determine how the tile should be rendered. The terrain layer with the lowest
precedence should always be rendered as "all", and no terrain layers should have
a mask value of 0.

======= ===================================================
Mask    Configuration (``x`` denotes corner on layer above)
------- ---------------------------------------------------
``0x0`` none::

            o  o
            o  o
------- ---------------------------------------------------
``0x1`` NE convex corner::

            o  o
            x  o
------- ---------------------------------------------------
``0x2`` NW convex corner::

            o  o
            o  x
------- ---------------------------------------------------
``0x3`` S to N::

            o  o
            x  x
------- ---------------------------------------------------
``0x4`` SW convex corner::

            o  x
            o  o
------- ---------------------------------------------------
``0x5`` saddle point, NE to SW::

            o  x
            x  o
------- ---------------------------------------------------
``0x6`` E to W::

            o  x
            o  x
------- ---------------------------------------------------
``0x7`` NW concave corner::

            o  x
            x  x
------- ---------------------------------------------------
``0x8`` SE convex corner::

            x  o
            o  o
------- ---------------------------------------------------
``0x9`` W to E::

            x  o
            x  o
------- ---------------------------------------------------
``0xa`` saddle point, NE to SE::

            x  o
            o  x
------- ---------------------------------------------------
``0xb`` NE concave corner::

            x  o
            x  x
------- ---------------------------------------------------
``0xc`` N to S::

            x  x
            o  o
------- ---------------------------------------------------
``0xd`` SE concave corner::

            x  x
            x  o
------- ---------------------------------------------------
``0xe`` SW concave corner::

            x  x
            o  x
------- ---------------------------------------------------
``0xf`` full::

            x  x
            x  x
======= ===================================================

Region
~~~~~~
Regions partition tiles and corners into large chunks (16x16 and 17x17,
respectively), such that the client does not need to request each tile
individually. The client can subscribe to receive messages from a single region
and discard the messages it doesn't need server-side, such that subscribing to
regional message queues is not linear in proportion the number of tiles
occupying the viewport.

Additionally, regions may correspond to pre-rendered chunks of terrain.

Entities
--------
Entities are fixtures on a map which trigger events (e.g. buildings transport
the player to different realms, anvils allow for players to forge weapons from
ingots, actors who roam around).

Actors
~~~~~~
Actors are NPCs or players, who are free to move around. They may also engage in
combat.

NPCs
~~~~
NPCs are controlled by an auxiliary server, which acts as a normal human player
with the exception that the server knows that the players controlled by the NPC
server are NPCs.

Coordinate Systems
------------------
Multiple coordinate systems are defined to ensure data integrity (e.g. ensuring
the coordinate (17, 1) cannot appear in the region (0, 0, 16, 16)).
Additionally, distinct coordinate systems for corners and tiles discourages
blind transformations from one to another.

The bare coordinate systems (*x*, *y*) and (*s*, *t*) should not be used --
variables, columns, and fields should never bear these names.

Position information is always stored as a realm reference, absolute region
coordinates, then relative tile coordinates. Absolute tile coordinates can
always be calculated from this position format with zero network traffic.

Relative Tile Coordinates (*rx*, *ry*)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tiles form a Cartesian coordinate system, relative to the most north-west tile
of their region, extending to the most south-east tile. Their position is the
midpoint of their four surrounding corner coordinates. They are bounded from 0
to the region size. They do not have physical storage.

Relative Corner Coordinates (*rs*, *rt*)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Corners also form a Cartesian coordinate system, relative to the north-west
corner of their region, extending to the south-east corner. They are bounded
from 0 to the region size + 1 and stored in the corners column of a region.

Absolute Region Coordinates (*arx*, *ary*)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Absolute region coordinates form a coordinate system where each step is the
width/height of a region rather than a single tile. Absolute region coordinates
are used in both the computation of absolute tile coordinates and absolute
corner coordinates, and are stored in the region’s columns.

Absolute Tile Coordinates (*ax*, *ay*)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Absolute tile coordinates are computed by finding the coordinate of their parent
region, multiplying by the region size, and adding the relative tile coordinate.
These are always computed.

Absolute Corner Coordinates (*as*, *at*)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Absolute corner coordinates are computed by finding the coordinate of their
parent region, multiplying by the region size, and adding the relative corner
coordinate. These are always computed.

Screen Coordinates (*sx*, *sy*)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
These are the coordinates used in screen-space, e.g. 1 unit of *sx*/*sy* is 1
exactly pixel.
