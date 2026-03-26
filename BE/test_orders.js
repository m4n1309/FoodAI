import db from './src/models/index.js';
import orderService from './src/services/orderService.js';

async function test() {
  try {
    const data = await orderService.getAllOrders({ restaurantId: 1, page: 1, limit: 10 });
    console.log("Success: Total orders =", data.total);
  } catch (err) {
    console.error("Error connecting or fetching:", err);
  } finally {
    process.exit(0);
  }
}
test();
