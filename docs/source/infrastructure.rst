Infrastructure
==============

Realm Server
------------
The server is written in Python 3. It is stateless such that if the server
crashes, it doesn't have to deal with data integrity and pushes the
responsibility to its various backends.

Tornado
~~~~~~~
Tornado is an asynchronous HTTP server designed for handling high amounts of I/O
using a single kernel thread via cooperative multitasking. This makes it well-
suited for a design where the backends handle most of the CPU work, and also for
long-running requests where I/O is sparse (e.g. chat messages over WebSockets).

Postgres
~~~~~~~~
Postgres is used for persistent data storage, e.g. player details, terrain, map
entities. Transactions are employed to ensure that player actions are atomic and
strongly consistent, e.g. using a restorative must atomically decrement the
quantity of the item and increment the player's health -- transient states
between the two should not occur.

RabbitMQ
~~~~~~~~
RabbitMQ is used for relaying messages across clients, e.g. chat, updating
players on other players' moves. RabbitMQ provides queue durability such that in
the event of a server crash, state can be transparently restored to all clients.

RabbitMQ uses the AMQP model of message queuing. As such, a global direct-type
exchange is defined for player-player messaging. Each client connection is bound
to a queue which is named after the player and holds the messages directed
towards the player. Each player binds itself to the global exchange via a
routing key:

 * ``players.$player_id``

   A message to a player.

 * ``regions.$realm_id.${arx}_${ary}``

   A message to a region.

 * ``chatrooms.$chatroom_name``

   A message to a chatroom.

A connection to RabbitMQ declares the direct exchange and binds the associated
player, region, and chat room routing keys to its queues.

Greenlet
~~~~~~~~
The realm server makes extensive use of Greenlet -- a green thread library. This
masquerades asynchronous calls as synchronous calls by allowing green threads to
yield to each other.

NPC Server
----------
A supplementary NPC server handles the execution of NPC behaviors -- NPCs
include entities such as wild creatures, shopkeepers, etc. It talks to the
server via WebSocket calls, but is allowed to use the "origin" field with all of
its requests to indicate which NPC to use. The NPC server authenticates to the
realm server with a predetermined token, which it presents to the realm server
on connection.

The NPC server exposes RPC calls to the realm server, such as "add NPC to tile",
"remove NPC with ID #", and "retrieve owning player information for NPC". The
NPC server does not share the same database as the realm server, and only knows
as much information about the world as a normal human player.

Client
------
The client is written in ECMAScript 6, compiled into JavaScript via JSTransform.
The compilation is done with Gulp Watchify builds. The client handles the bulk
of computation (e.g. pathing, terrain tile computation) such that the server is
solely focused on database queries and filtering out message queue consumptions.

React
~~~~~~
React provides efficient rendering and one-way binding for responsive
interfaces. The client uses the Flux architecture to structure code.

Browserify
~~~~~~~~~~
Browserify bundles modules together into a single file using CommonJS
constructs.

SockJS
~~~~~~
SockJS provides WebSocket functionality, as well as alternative transport shims
for browsers that don't support websockets.

Less
~~~~
Less is used for compiling Less to CSS -- an extension of CSS that allows for
variables and functions.

Map Rendering
~~~~~~~~~~~~~
Maps are rendered on the client in two layers:

Terrain
+++++++
This is the bottom-most level of the map, computed by Marching Squares. The base
terrain map (e.g. grass, water, sand) is displayed on this layer. If the terrain
is invalidated (e.g. a corner changes terrain), Marching Squares must be run
again for the tiles surrounding the corner, then a new region buffer created.

Entities
++++++++
A bounding-box check is performed to cull all entities that are not on screen.
Entities will be rendered iff their bounding box intersects the viewport's
bounding box. They are ordered by their ay coordinate (or sy, as entities culled
off the screen don't matter), such that a higher ay indicates an object is more
in front.

All entities are displayed on this layer, ranging from large entities (e.g.
buildings, walls, etc.) to small entities (e.g. actors). It is expected to be
sparser than the terrain layer and therefore the rendering of it on a per-entity
basis should have a much lighter load. They are also likely to be invalidated
much more often than terrain (e.g. from actors moving around). Maps are rendered
on a region-by-region basis -- terrain tile data is pre-rendered into region-
sized buffers to optimize calls to drawImage.

There is no use of damaged areas (dirty rectangles) to keep track of what needs
to be re-rendered, as canvas should be able to handle hundreds of sprites
without issue (making sure to round numbers with fractional parts to integers,
as fractional coordinates can be slow in some browsers).
