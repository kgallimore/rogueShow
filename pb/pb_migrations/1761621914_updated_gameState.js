/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // remove field
  collection.fields.removeById("number646683805")

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_990919031",
    "hidden": false,
    "id": "relation1977395940",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "currentAgent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // add field
  collection.fields.addAt(1, new Field({
    "hidden": false,
    "id": "number646683805",
    "max": null,
    "min": 0,
    "name": "agent",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // remove field
  collection.fields.removeById("relation1977395940")

  return app.save(collection)
})
