/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3904039518")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_BLWo9Qm4rD` ON `reesesProducts` (`name`)",
      "CREATE UNIQUE INDEX `idx_NleR2s2VrM` ON `reesesProducts` (`order`)"
    ]
  }, collection)

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number4113142680",
    "max": null,
    "min": 1,
    "name": "order",
    "onlyInt": true,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3904039518")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_BLWo9Qm4rD` ON `reesesProducts` (`name`)"
    ]
  }, collection)

  // remove field
  collection.fields.removeById("number4113142680")

  return app.save(collection)
})
