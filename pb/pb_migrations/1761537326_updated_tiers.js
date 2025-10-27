/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3707864393")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_7OpiI5hIrU` ON `tiers` (`Rank`)"
    ]
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3707864393")

  // update collection data
  unmarshal({
    "indexes": []
  }, collection)

  return app.save(collection)
})
