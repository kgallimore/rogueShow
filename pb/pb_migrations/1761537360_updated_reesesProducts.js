/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3904039518")

  // add field
  collection.fields.addAt(3, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3707864393",
    "hidden": false,
    "id": "relation614373258",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "tier",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3904039518")

  // remove field
  collection.fields.removeById("relation614373258")

  return app.save(collection)
})
