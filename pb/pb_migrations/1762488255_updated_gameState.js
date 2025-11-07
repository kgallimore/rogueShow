/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // update collection data
  unmarshal({
    "listRule": "",
    "updateRule": "@request.auth.admin = true",
    "viewRule": ""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2957576016")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.admin = true\n\n",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
