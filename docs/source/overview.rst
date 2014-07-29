Overview
========

This document outlines the technical considerations of implementing the engine
(*Elpizo*) for Rekindled Hope. The design focuses on consistency and durability
over performance:

 * No states should arise that are not specified in the game design document,
   nor any transient states that represent the interruption of an atomic
   operation as if it was run non-atomically.

 * All data is always persistent to durable storage mediums such that, in the
   event of a crash, no data is lost.

The state is permanently persisted on backends (database, message queue) rather
than in-memory on the server. This ensures that the server does not need to be
responsible for persistence and durability, with the responsibilities being
offloaded to upstream. Therefore, in the event of a server crash, the game world
state will be entirely consistent when the server restarts.

One caveat is that this comes at the expense of performance (in-memory reads
will always trump database queries) -- but this can be mitigated by fronting
database reads with caches, or denormalizing data.
