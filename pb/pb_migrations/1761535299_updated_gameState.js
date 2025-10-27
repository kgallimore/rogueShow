/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3904039518",
    "hidden": false,
    "id": "relation3792503004",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "currentProduct",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // remove field
  collection.fields.removeById("relation3792503004")

  return app.save(collection)
})
