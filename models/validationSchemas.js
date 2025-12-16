const { z } = require("zod");

const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(["user", "admin"]).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ProductCreateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(0).max(500).optional().default(""),
  price: z.number().positive(),
  inStock: z.boolean().optional().default(true),
});

const ProductUpdateSchema = ProductCreateSchema.partial();

const OrderCreateSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().positive(),
      })
    )
    .min(1),
});

module.exports = {
  RegisterSchema,
  LoginSchema,
  ProductCreateSchema,
  ProductUpdateSchema,
  OrderCreateSchema,
};