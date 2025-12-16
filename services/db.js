const db = {
  users: [], // { id, name, email, passwordHash, role }
  products: [], // { id, name, description, price, inStock, createdAt }
  orders: [], // { id, userId, items: [{productId, qty}], total, createdAt }
};

module.exports = db;