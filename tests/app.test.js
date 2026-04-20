/**
 * tests/app.test.js
 *
 * Unit tests for app.js — no supertest, no refactor, no extra dependencies.
 * Handlers are extracted from the Express router stack and called directly
 * with mock req/res objects.
 */

// ─── Mock uuid BEFORE requiring app ──────────────────────────────────────────
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));

// ─── Mock better-sqlite3 BEFORE requiring app ────────────────────────────────
const mockRun     = jest.fn();
const mockGet     = jest.fn();
const mockAll     = jest.fn();
const mockPrepare = jest.fn(() => ({ run: mockRun, get: mockGet, all: mockAll }));

jest.mock('better-sqlite3', () =>
  jest.fn(() => ({ exec: jest.fn(), prepare: mockPrepare }))
);

// ─── Load app AFTER mocks ─────────────────────────────────────────────────────
const app = require('../app');

// ─── Extract route handlers from the Express router stack ────────────────────
function getHandler(method, path) {
  for (const layer of app._router.stack) {
    if (!layer.route) continue;
    if (
      layer.route.path === path &&
      layer.route.methods[method.toLowerCase()]
    ) {
      const stack = layer.route.stack;
      return stack[stack.length - 1].handle;
    }
  }
  throw new Error(`No handler found for ${method} ${path}`);
}

const createOrder       = getHandler('post',   '/orders');
const getAllOrders       = getHandler('get',    '/orders');
const getOrderById      = getHandler('get',    '/orders/:id');
const updateOrderStatus = getHandler('patch',  '/orders/:id');
const deleteOrder       = getHandler('delete', '/orders/:id');

// ─── Helper: mock Express res ─────────────────────────────────────────────────
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

// ─── Shared fixture ───────────────────────────────────────────────────────────
const VALID_ORDER = {
  id:         'mock-uuid-1234',
  customer:   'Alice',
  product:    'Widget',
  quantity:   2,
  status:     'Pending',
  created_at: '2025-01-01T00:00:00.000Z',
};

beforeEach(() => jest.clearAllMocks());

// ═══════════════════════════════════════════════════════════════════════════════
// POST /orders
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /orders — createOrder', () => {
  it('returns 201 with new order for valid inputs', async () => {
    mockRun.mockReturnValue({ changes: 1 });
    const req = { body: { customer: 'Alice', product: 'Widget', quantity: 2 } };
    const res = mockRes();
    await createOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Order created successfully',
        transactionId: 'mock-uuid-1234',
        order: expect.objectContaining({ customer: 'Alice', product: 'Widget', quantity: 2, status: 'Pending' }),
      })
    );
  });

  it('returns 400 when customer is missing', async () => {
    const res = mockRes();
    await createOrder({ body: { product: 'Widget', quantity: 2 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Missing required fields/) }));
  });

  it('returns 400 when product is missing', async () => {
    const res = mockRes();
    await createOrder({ body: { customer: 'Alice', quantity: 2 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Missing required fields/) }));
  });

  it('returns 400 when quantity is missing', async () => {
    const res = mockRes();
    await createOrder({ body: { customer: 'Alice', product: 'Widget' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Missing required fields/) }));
  });

  it('returns 400 when quantity is 0 (lower boundary)', async () => {
    const res = mockRes();
    await createOrder({ body: { customer: 'Alice', product: 'Widget', quantity: 0 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'quantity must be a positive integer' }));
  });

  it('returns 400 when quantity is negative', async () => {
    const res = mockRes();
    await createOrder({ body: { customer: 'Alice', product: 'Widget', quantity: -5 } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'quantity must be a positive integer' }));
  });

  it('returns 400 when quantity is a string (wrong type)', async () => {
    const res = mockRes();
    await createOrder({ body: { customer: 'Alice', product: 'Widget', quantity: 'two' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'quantity must be a positive integer' }));
  });

  it('accepts quantity of 1 (minimum valid boundary)', async () => {
    mockRun.mockReturnValue({ changes: 1 });
    const res = mockRes();
    await createOrder({ body: { customer: 'Alice', product: 'Widget', quantity: 1 } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ order: expect.objectContaining({ quantity: 1 }) }));
  });

  it('returns 500 when DB insert throws', async () => {
    mockRun.mockImplementation(() => { throw new Error('DB write failed'); });
    const res = mockRes();
    await createOrder({ body: { customer: 'Alice', product: 'Widget', quantity: 2 } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal server error', details: 'DB write failed' }));
  });

  it('returns 402 when payment gateway denies authorization', async () => {
    // simulatePaymentGateway is a private function inside app.js that always
    // resolves with authorized: true. To test the defensive 402 branch we
    // use jest.useFakeTimers + spyOn to make it resolve with authorized: false.
    jest.useFakeTimers();

    const res = mockRes();
    const req = { body: { customer: 'Alice', product: 'Widget', quantity: 2 } };

    // Patch global Promise so the next .then() gets authorized:false
    const realPromise = global.Promise;
    global.Promise = class extends realPromise {
      constructor(executor) {
        super((resolve, reject) => {
          // Intercept the simulatePaymentGateway promise only
          const wrappedResolve = (val) => {
            if (val && typeof val === 'object' && 'authorized' in val) {
              resolve({ ...val, authorized: false });
            } else {
              resolve(val);
            }
          };
          executor(wrappedResolve, reject);
        });
      }
    };

    const promise = createOrder(req, res);
    jest.runAllTimers();
    await promise;

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Payment authorization failed' })
    );

    global.Promise = realPromise;
    jest.useRealTimers();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /orders
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /orders — getAllOrders', () => {
  it('returns 200 with all orders', () => {
    mockAll.mockReturnValue([VALID_ORDER]);
    const res = mockRes();
    getAllOrders({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 1, orders: [VALID_ORDER] });
  });

  it('returns 200 with empty array when no orders exist', () => {
    mockAll.mockReturnValue([]);
    const res = mockRes();
    getAllOrders({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ count: 0, orders: [] });
  });

  it('returns correct count for multiple orders', () => {
    mockAll.mockReturnValue([VALID_ORDER, { ...VALID_ORDER, id: 'other-id' }]);
    const res = mockRes();
    getAllOrders({}, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 2 }));
  });

  it('returns 500 when DB throws', () => {
    mockAll.mockImplementation(() => { throw new Error('DB read error'); });
    const res = mockRes();
    getAllOrders({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal server error', details: 'DB read error' }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /orders/:id — getOrderById', () => {
  it('returns 200 and the order when found', () => {
    mockGet.mockReturnValue(VALID_ORDER);
    const res = mockRes();
    getOrderById({ params: { id: 'mock-uuid-1234' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(VALID_ORDER);
  });

  it('returns 404 when order is not found', () => {
    mockGet.mockReturnValue(undefined);
    const res = mockRes();
    getOrderById({ params: { id: 'nonexistent-id' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('nonexistent-id') }));
  });

  it('passes the correct id to the DB query', () => {
    mockGet.mockReturnValue(VALID_ORDER);
    const res = mockRes();
    getOrderById({ params: { id: 'mock-uuid-1234' } }, res);
    expect(mockGet).toHaveBeenCalledWith('mock-uuid-1234');
  });

  it('returns 500 when DB throws', () => {
    mockGet.mockImplementation(() => { throw new Error('DB failure'); });
    const res = mockRes();
    getOrderById({ params: { id: 'mock-uuid-1234' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal server error' }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
describe('PATCH /orders/:id — updateOrderStatus', () => {
  it('returns 200 with updated order for a valid status', () => {
    mockGet.mockReturnValueOnce(VALID_ORDER).mockReturnValueOnce({ ...VALID_ORDER, status: 'Shipped' });
    mockRun.mockReturnValue({ changes: 1 });
    const res = mockRes();
    updateOrderStatus({ params: { id: 'mock-uuid-1234' }, body: { status: 'Shipped' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Order status updated', order: expect.objectContaining({ status: 'Shipped' }) }));
  });

  it('accepts all five valid status values', () => {
    for (const status of ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']) {
      jest.clearAllMocks();
      mockGet.mockReturnValueOnce(VALID_ORDER).mockReturnValueOnce({ ...VALID_ORDER, status });
      mockRun.mockReturnValue({ changes: 1 });
      const res = mockRes();
      updateOrderStatus({ params: { id: 'mock-uuid-1234' }, body: { status } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ order: expect.objectContaining({ status }) }));
    }
  });

  it('returns 400 when status field is missing', () => {
    const res = mockRes();
    updateOrderStatus({ params: { id: 'mock-uuid-1234' }, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing required field: status' }));
  });

  it('returns 400 for an invalid status value', () => {
    const res = mockRes();
    updateOrderStatus({ params: { id: 'mock-uuid-1234' }, body: { status: 'Exploded' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Invalid status/) }));
  });

  it('returns 400 for wrong-cased status (edge case)', () => {
    const res = mockRes();
    updateOrderStatus({ params: { id: 'mock-uuid-1234' }, body: { status: 'shipped' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when order does not exist', () => {
    mockGet.mockReturnValue(undefined);
    const res = mockRes();
    updateOrderStatus({ params: { id: 'ghost-id' }, body: { status: 'Shipped' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('ghost-id') }));
  });

  it('returns 500 when DB throws', () => {
    mockGet.mockImplementation(() => { throw new Error('DB error'); });
    const res = mockRes();
    updateOrderStatus({ params: { id: 'mock-uuid-1234' }, body: { status: 'Shipped' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal server error' }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /orders/:id
// ═══════════════════════════════════════════════════════════════════════════════
describe('DELETE /orders/:id — deleteOrder', () => {
  it('returns 200 with confirmation message when order exists', () => {
    mockGet.mockReturnValue(VALID_ORDER);
    mockRun.mockReturnValue({ changes: 1 });
    const res = mockRes();
    deleteOrder({ params: { id: 'mock-uuid-1234' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('mock-uuid-1234') }));
  });

  it('returns 404 when order does not exist', () => {
    mockGet.mockReturnValue(undefined);
    const res = mockRes();
    deleteOrder({ params: { id: 'ghost-id' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('ghost-id') }));
  });

  it('returns 500 when DB throws on existence check', () => {
    mockGet.mockImplementation(() => { throw new Error('DB failure'); });
    const res = mockRes();
    deleteOrder({ params: { id: 'mock-uuid-1234' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal server error', details: 'DB failure' }));
  });

  it('returns 500 when DB throws on delete', () => {
    mockGet.mockReturnValue(VALID_ORDER);
    mockRun.mockImplementation(() => { throw new Error('Delete failed'); });
    const res = mockRes();
    deleteOrder({ params: { id: 'mock-uuid-1234' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal server error', details: 'Delete failed' }));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 404 Fallback middleware (line 148)
// ═══════════════════════════════════════════════════════════════════════════════
describe('404 fallback middleware', () => {
  it('returns 404 with error message for unknown routes', () => {
    // Extract the catch-all middleware (last layer with no route)
    const fallback = app._router.stack
      .filter(l => !l.route && l.handle.length === 2)
      .slice(-1)[0].handle;

    const req = { method: 'GET', path: '/unknown' };
    const res = mockRes();

    fallback(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('not found') })
    );
  });
});
