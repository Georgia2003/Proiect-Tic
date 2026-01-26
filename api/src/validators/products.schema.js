// api/src/validators/products.schema.js
import Joi from "joi";

const locationSchema = Joi.object({
  warehouse: Joi.string().trim().min(2).max(60).required(),
  quantity: Joi.number().integer().min(0).max(1_000_000).required(),
});

export const productCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  price: Joi.number().min(0).max(1_000_000_000).required(),
  description: Joi.string().trim().max(500).allow("").default(""),

  categoryName: Joi.string().trim().min(2).max(60).allow("").default("General"),
  categoryFeatures: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().min(1).max(30)).max(10),
      Joi.string().trim().allow("")
    )
    .default([]),

  inventoryTotal: Joi.number().integer().min(0).max(1_000_000).default(0),
  inventoryLocations: Joi.array().items(locationSchema).max(20).default([]),
});

export const productUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  price: Joi.number().min(0).max(1_000_000_000),
  description: Joi.string().trim().max(500).allow(""),

  categoryName: Joi.string().trim().min(2).max(60).allow(""),
  categoryFeatures: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().min(1).max(30)).max(10),
    Joi.string().trim().allow("")
  ),

  inventoryTotal: Joi.number().integer().min(0).max(1_000_000),
  inventoryLocations: Joi.array().items(locationSchema).max(20),
})
  .min(1)
  .messages({ "object.min": "At least one field must be provided for update." });
