/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3904039518")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "text4579384326",
    "max": 1000,
    "min": 0,
    "name": "description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "file5579384326",
    "maxSelect": 10,
    "maxSize": 0,
    "mimeTypes": [
      "image/webp",
      "image/jpeg",
      "image/png"
    ],
    "name": "imageGallery",
    "presentable": false,
    "protected": false,
    "required": false,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // update field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "text6579384326",
    "max": 50,
    "min": 0,
    "name": "bucketKey",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // update field
  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3707864393",
    "hidden": false,
    "id": "relation7579384326",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "canonicalTier",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add index
  collection.indexes.push(
    "CREATE INDEX `idx_bucket_key` ON `reesesProducts` (`bucketKey`)"
  )

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3904039518")

  // remove field
  collection.fields.removeById("text4579384326")

  // remove field
  collection.fields.removeById("file5579384326")

  // remove field
  collection.fields.removeById("text6579384326")

  // remove field
  collection.fields.removeById("relation7579384326")

  // remove index
  collection.indexes = collection.indexes.filter(index => 
    index !== "CREATE INDEX `idx_bucket_key` ON `reesesProducts` (`bucketKey`)"
  )

  return app.save(collection)
})
