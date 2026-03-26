import db from './src/models/index.js';
import orderService from './src/services/orderService.js';

async function test() {
  try {
    const data = await orderService.getAllOrders({ restaurantId: 1, page: 1, limit: 1 });
    console.log(JSON.stringify(data.orders[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();
