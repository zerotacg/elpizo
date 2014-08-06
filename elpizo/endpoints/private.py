from .. import game_pb2
from ..models.realm import Region


def on_open(ctx):
  # Bind to the relevant channels.
  ctx.subscribe(ctx.player.routing_key)
  ctx.subscribe(ctx.player.realm.routing_key)

  # Send realm information.
  ctx.send(game_pb2.Packet.REALM, None,
           game_pb2.RealmPacket(realm=ctx.player.realm.to_protobuf()))


def viewport(ctx, message):
  last_viewport = ctx.transient_storage.get(
      "viewport",
      game_pb2.ViewportPacket(a_left=0, a_top=0, a_right=0, a_bottom=0))

  ctx.transient_storage["viewport"] = message

  last_regions = {region.key: region
      for region in ctx.application.sqla.query(Region).filter(
      Region.bounded_by(last_viewport.a_left, last_viewport.a_top,
                        last_viewport.a_right, last_viewport.a_bottom))}

  regions = {region.key: region
      for region in ctx.application.sqla.query(Region).filter(
      Region.bounded_by(message.a_left, message.a_top,
                        message.a_right, message.a_bottom))}


  for added_region_key in set(regions.keys()) - set(last_regions.keys()):
    region = regions[added_region_key]

    ctx.send(game_pb2.Packet.REGION, None,
             game_pb2.RegionPacket(region=region.to_protobuf()))
    ctx.subscribe(region.routing_key)

    for entity in region.entities:
      ctx.send(game_pb2.Packet.ENTITY, None,
               game_pb2.EntityPacket(entity=entity.to_protobuf()))

  for removed_region_key in set(last_regions.keys()) - set(regions.keys()):
    region = regions[removed_region_key]
    ctx.unsubscribe(region.routing_key)

  ctx.send(game_pb2.Packet.AVATAR, ctx.player.to_origin_protobuf(),
           game_pb2.AvatarPacket())
