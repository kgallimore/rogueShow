/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool2429473028",
    "name": "interactionEnabled",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "bool2429473028",
    "name": "interactionEnabled",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
})
