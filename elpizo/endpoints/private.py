from .. import game_pb2
from ..models.realm import Region


def on_open(ctx):
  # Bind to the relevant channels.
  ctx.subscribe(ctx.player.routing_key)
  ctx.subscribe(ctx.player.realm.routing_key)

  # Set the player to online.
  ctx.publish(ctx.player.realm.routing_key, game_pb2.StatusPacket(online=True))

  ctx.player.online = True
  ctx.sqla.commit()

  # Send realm information.
  ctx.send(None, game_pb2.RealmPacket(realm=ctx.player.realm.to_protobuf()))
  ctx.send(None, game_pb2.EntityPacket(entity=ctx.player.to_protobuf()))
  ctx.send(ctx.player.id, game_pb2.AvatarPacket())


def on_close(ctx):
  ctx.publish(ctx.player.realm.routing_key, game_pb2.StatusPacket(online=False))

  ctx.player.online = False
  ctx.sqla.commit()


def viewport(ctx, message):
  last_viewport = ctx.transient_storage.get("viewport")

  ctx.transient_storage["viewport"] = message

  if last_viewport is not None:
    last_regions = {region.key: region
        for region in ctx.sqla.query(Region).filter(
        Region.bounded_by(last_viewport.a_left, last_viewport.a_top,
                          last_viewport.a_right, last_viewport.a_bottom))}
  else:
    last_regions = {}

  regions = {region.key: region
      for region in ctx.sqla.query(Region).filter(
      Region.bounded_by(message.a_left, message.a_top,
                        message.a_right, message.a_bottom))}

  for added_region_key in set(regions.keys()) - set(last_regions.keys()):
    region = regions[added_region_key]

    ctx.send(None, game_pb2.RegionPacket(region=region.to_protobuf()))
    ctx.subscribe(region.routing_key)

    for entity in region.entities:
      if entity is not ctx.player:
        ctx.send(None, game_pb2.EntityPacket(entity=entity.to_protobuf()))

  for removed_region_key in set(last_regions.keys()) - set(regions.keys()):
    region = regions[removed_region_key]
    ctx.unsubscribe(region.routing_key)
