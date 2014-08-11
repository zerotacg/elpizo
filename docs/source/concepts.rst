Concepts
========

Realms
------
Realms are disconnected maps that players can travel within. They are associated
with a set of terrain tables, which are used to represent the base map for a
realm. The terrain tables store tiles as arrays as a column per region, indexed
by absolute region space. This is a denormalized design which trades off
efficiency for data consistency (arguably, this is the antipattern known as
"jaywalking") -- however, it is unlikely that individual tiles will ever need to
be queried in a relational manner.

Tiles
~~~~~
Tiles are the locations where entities (buildings, actors, etc.) can be placed
in a realm. In the database, tiles are duplicated along the east and south edges
in order to allow the client to render from a single region -- care must be
taken to ensure consistency when editing tiles.

Corners
~~~~~~~
Corners are the dual of tiles and exist only for rendering. Their configurations
are computed by the Marching Squares algorithm (see below). Physically, they are
offset a half tile from the left and a half tile from the top.

Marching Squares
++++++++++++++++
A strict precedence of terrain types is determined beforehand, e.g. ocean <
beach < grass < river < lake.

In parallel, each tile is mapped over to find the tile's four corners. Then, the
terrains of the four corners are independently sorted in order of precedence,
and the following is computed for each terrain type in order::

  m = (tile_nw in A) << 3 | (tile_ne in A) << 2 |
      (tile_se in A) << 1 | (tile_sw in A) << 0

The resulting value, ``m``, is the *mask value* and is located in a lookup table
to determine how the tile should be rendered. The terrain layer with the lowest
precedence should always be rendered as "all", and no terrain layers should have
a mask value of 0.

======= ===================================================
Mask    Configuration (``x`` denotes tile on layer above)
------- ---------------------------------------------------
``0x0`` none::

            o  o
            o  o
------- ---------------------------------------------------
``0x1`` NE convex tile::

            o  o
            x  o
------- ---------------------------------------------------
``0x2`` NW convex tile::

            o  o
            o  x
------- ---------------------------------------------------
``0x3`` S to N::

            o  o
            x  x
------- ---------------------------------------------------
``0x4`` SW convex tile::

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
``0x7`` NW concave tile::

            o  x
            x  x
------- ---------------------------------------------------
``0x8`` SE convex tile::

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
``0xb`` NE concave tile::

            x  o
            x  x
------- ---------------------------------------------------
``0xc`` N to S::

            x  x
            o  o
------- ---------------------------------------------------
``0xd`` SE concave tile::

            x  x
            x  o
------- ---------------------------------------------------
``0xe`` SW concave tile::

            x  x
            o  x
------- ---------------------------------------------------
``0xf`` full::

            x  x
            x  x
======= ===================================================

Region
~~~~~~
Regions partition tiles into large chunks (17x17), such that the client does not
need to request each tile individually. The client can subscribe to receive
messages from a single region and discard the messages it doesn't need
server-side, such that subscribing to regional message queues is not linear in
proportion the number of tiles occupying the viewport.

Additionally, regions may correspond to pre-rendered chunks of terrain.

Actors
~~~~~~
Actors are NPCs or players, who are free to move around. They may also engage in
combat.

NPCs
~~~~
NPCs are controlled by an auxiliary server, which acts as a normal human player
with the exception that the server knows that the players controlled by the NPC
server are NPCs.

Fixtures
~~~~~~~~
Fixtures are fixed entities on the map which players may activate to trigger
events (e.g. trees, ore rocks, etc.).

Coordinate Systems
------------------
Multiple coordinate systems are defined to ensure data integrity (e.g. ensuring
the coordinate (17, 1) cannot appear in the region (0, 0, 16, 16)).
Additionally, distinct coordinate systems for corners and tiles discourages
blind transformations from one to another.

The bare coordinate system (*x*, *y*) should not be used -- variables, columns,
and fields should never bear these names.

Position information is always stored as a realm reference, absolute region
coordinates, then relative tile coordinates. Absolute tile coordinates can
always be calculated from this position format with zero network traffic.

Relative Tile Coordinates (*rx*, *ry*)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tiles form a Cartesian coordinate system, relative to the most north-west tile
of their region, extending to the most south-east tile. Their position is the
midpoint of their four surrounding corner coordinates. They are bounded from 0
to the region size. They do not have physical storage.

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

Screen Coordinates (*sx*, *sy*)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
These are the coordinates used in screen-space, e.g. 1 unit of *sx*/*sy* is 1
exactly pixel.
