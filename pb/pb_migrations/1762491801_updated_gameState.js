/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "number506222981",
    "max": null,
    "min": 0,
    "name": "currentProductNum",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // update field
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
})
