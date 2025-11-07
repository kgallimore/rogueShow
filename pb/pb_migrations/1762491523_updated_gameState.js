/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // remove field
  collection.fields.removeById("relation3792503004")

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number506222981",
    "max": null,
    "min": 0,
    "name": "currentProductNum",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3904039518",
    "hidden": false,
    "id": "relation3792503004",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "currentProduct",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // remove field
  collection.fields.removeById("number506222981")

  return app.save(collection)
})
