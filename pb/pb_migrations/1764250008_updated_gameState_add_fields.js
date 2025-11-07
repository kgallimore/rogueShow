/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // update field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2000000001",
    "hidden": false,
    "id": "relation1579384326",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "currentShowId",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select2579384326",
    "maxSelect": 1,
    "name": "currentMode",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "tierlist",
      "rogue",
      "interstitial"
    ]
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number3579384326",
    "max": 3,
    "min": 0,
    "name": "rogueStage",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "bool4579384326",
    "name": "frictionEnabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // remove field
  collection.fields.removeById("relation1579384326")

  // remove field
  collection.fields.removeById("select2579384326")

  // remove field
  collection.fields.removeById("number3579384326")

  // remove field
  collection.fields.removeById("bool4579384326")

  return app.save(collection)
})
