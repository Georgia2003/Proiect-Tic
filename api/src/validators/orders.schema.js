// api/src/validators/orders.schema.js
import Joi from "joi";

const orderProductSchema = Joi.object({
  productId: Joi.string().trim().min(3).max(200).required(),
  quantity: Joi.number().integer().min(1).max(10_000).required(),
  priceAtPurchase: Joi.number().min(0).max(1_000_000_000).required(),
  productSnapshot: Joi.object().unknown(true).default({}),
});

const shippingSchema = Joi.object({
  address: Joi.string().trim().min(3).max(120).required(),
  city: Joi.string().trim().min(2).max(60).required(),
  tracking: Joi.string().trim().max(80).allow("").default(""),
});

export const orderCreateSchema = Joi.object({
  products: Joi.array().items(orderProductSchema).min(1).required(),
  status: Joi.string().trim().min(2).max(30).default("processing"),
  shipping: shippingSchema.required(),
});

export const orderUpdateSchema = Joi.object({
  status: Joi.string().trim().min(2).max(30),
  shipping: Joi.object({
    address: Joi.string().trim().min(3).max(120),
    city: Joi.string().trim().min(2).max(60),
    tracking: Joi.string().trim().max(80).allow(""),
  }).min(1),
})
  .min(1)
  .messages({ "object.min": "At least one field must be provided for update." });
