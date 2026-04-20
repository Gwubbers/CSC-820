# Test Plan: Order Management API
**Author:** Kayden Grubbs

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Testing Scope](#2-testing-scope)
3. [Testing Approach](#3-testing-approach)
4. [Test Environment](#4-test-environment)
5. [Test Deliverables](#5-test-deliverables)
6. [Testing Objectives](#6-testing-objectives)
7. [Unit Test Cases](#7-unit-test-cases)
8. [Unit Test Results (Module 12)](#8-unit-test-results-module-12)
9. [Integration Test Cases](#9-integration-test-cases)
10. [Postman Test Cases](#10-postman-test-cases)
11. [Postman Test Results](#11-postman-test-results)

---

## 1. Introduction

This test plan showcases how the Order Management REST API will be evaluated. The API is built on Node.js and creates endpoints for creating, reading, updating, and deleting order records using CRUD fundamentals, endpoints include (`GET /orders`, `GET /orders/:id`, `POST /orders`, `PATCH /orders/:id`, and `DELETE /orders/:id`). Testing focuses on unit and integration testing, as well as Postman-based end-to-end validation, to ensure system reliability.

---

## 2. Testing Scope

The following endpoints are in scope:

| Method | Endpoint         | Description              |
|--------|------------------|--------------------------|
| GET    | `/orders`        | Retrieve all orders      |
| GET    | `/orders/:id`    | Retrieve a single order  |
| POST   | `/orders`        | Create a new order       |
| PATCH  | `/orders/:id`    | Update order status      |
| DELETE | `/orders/:id`    | Delete an order          |

**Out of scope:** Authentication/authorization, rate limiting, and deployment infrastructure.

---

## 3. Testing Approach

Testing is divided into three primary categories:

- **Unit Testing** — Each route handler and utility function is tested independently, utilizing mocked dependencies. Jest is used as the test framework.
- **Integration Testing** — End-to-end tests interact with a real database to confirm that HTTP requests properly modify data and produce accurate responses.
- **Postman Testing** — The API is validated externally using Postman scripts, checking status codes, response content, headers, and timing.

---

## 4. Test Environment

| Component        | Details                                              |
|------------------|------------------------------------------------------|
| Runtime          | Node.js v18+                                         |
| Framework        | Express.js                                           |
| Database         | SQLite (better-sqlite3, fully mocked in unit tests)  |
| Unit Test Tool   | Jest v29                                             |
| API Test Tool    | Postman (v10+)                                       |
| Port             | `https://order-api.hl1`                              |
| Test Data        | Seeded programmatically before each test suite run; mocked in unit tests |

---

## 5. Test Deliverables

- This Test Plan Document (updated with Module 12 unit test results)
- Jest unit test file: `tests/app.test.js`
- Postman Collection export (`OrderManagement.postman_collection.json`)
- Terminal screenshot of Jest test results and coverage table
- A summary of Postman test results, with analysis of planned failures, is included in Section 11.

---

## 6. Testing Objectives

### 6.1 Unit Testing
Ensure each handler or utility function operates correctly and handles errors as expected when tested with controlled inputs, without using the database or HTTP stack.

- Check that valid inputs yield the correct data structure and status codes.
- Verify that missing or invalid inputs lead to suitable error responses (such as 400 or 404).
- Check that edge cases (like empty strings, zero quantities, or wrong-cased values) are managed appropriately.

### 6.2 Integration Testing
Make sure the entire flow, from HTTP requests through route handlers to the database and back, functions as intended for all CRUD actions.

- Check that `POST /orders` adds a new record to the database with accurate field values.
- Ensure `GET /orders/:id` retrieves the proper record for valid IDs and returns a 404 for non-existent ones.
- Verify `PATCH /orders/:id` modifies only the status field of the targeted order in the database.
- Check that `DELETE /orders/:id` deletes the order and future read attempts return a 404 error.
- Make sure errors are handled gracefully if the database is unavailable or returns issues.

### 6.3 Postman Testing
Assess the API's HTTP responses from an outside client's view, including status codes, response structure, headers, and basic performance.

- Assert correct HTTP status codes for both happy-path and error scenarios.
- Validate that response bodies contain the expected fields and values.
- Confirm response times are within an acceptable range (< 500ms under local conditions).

---

## 7. Unit Test Cases

### 7.1 `createOrder` Handler

| Test Case ID | Description | Input | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| UT-01 | Create order with valid input | `{ "customer": "Alice", "product": "Widget", "quantity": 2 }` | Returns 201, body contains `id`, `customer`, `product`, `quantity`, `status: "Pending"`, `transactionId` | Pass if status is 201 and all fields match input |
| UT-02 | Create order with missing `customer` | `{ "product": "Widget", "quantity": 2 }` | Returns 400 with error message | Pass if status is 400 and body contains error description |
| UT-03 | Create order with missing `product` | `{ "customer": "Alice", "quantity": 2 }` | Returns 400 with error message | Pass if status is 400 |
| UT-04 | Create order with `quantity` of 0 | `{ "customer": "Alice", "product": "Widget", "quantity": 0 }` | Returns 400 (invalid quantity) | Pass if status is 400 |
| UT-05 | Create order with negative `quantity` | `{ "customer": "Alice", "product": "Widget", "quantity": -5 }` | Returns 400 | Pass if status is 400 |
| UT-06 | Create order with `quantity` as a string | `{ "customer": "Alice", "product": "Widget", "quantity": "two" }` | Returns 400 | Pass if status is 400 |
| UT-07 | Create order with extra unexpected fields | `{ "customer": "Alice", "product": "Widget", "quantity": 1, "discount": 0.5 }` | Returns 201; extra fields ignored | Pass if status is 201 and extra fields not persisted |

### 7.2 `getOrderById` Handler

| Test Case ID | Description | Input | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| UT-08 | Get order with valid existing ID | Valid UUID (seeded) | Returns 200 with correct order object | Pass if status 200 and body matches seeded data |
| UT-09 | Get order with non-existent ID | `00000000-0000-0000-0000-000000000000` | Returns 404 with error message | Pass if status is 404 |
| UT-10 | Get order with non-UUID ID | `id = "abc"` | Returns 404 with error message | Pass if status is 404 |

### 7.3 `updateOrderStatus` Handler

| Test Case ID | Description | Input | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| UT-11 | Update order with valid status | Valid UUID, `{ "status": "Shipped" }` | Returns 200 with updated order, `status: "Shipped"` | Pass if status 200 and `status` field is updated |
| UT-12 | Update order with non-existent ID | Non-existent UUID, `{ "status": "Shipped" }` | Returns 404 | Pass if status is 404 |
| UT-13 | Update order with invalid status value | Valid UUID, `{ "status": "Exploded" }` | Returns 400, error includes "Invalid status" | Pass if status is 400 |
| UT-14 | Update order with missing status field | Valid UUID, `{}` | Returns 400 | Pass if status is 400 |

### 7.4 `deleteOrder` Handler

| Test Case ID | Description | Input | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| UT-15 | Delete existing order | Valid UUID | Returns 200, message includes "deleted" | Pass if status is 200 |
| UT-16 | Delete non-existent order | Non-existent UUID | Returns 404 | Pass if status is 404 |
| UT-17 | Delete already-deleted order | Previously deleted UUID | Returns 404 | Pass if status is 404 |

### 7.5 `getAllOrders` Handler

| Test Case ID | Description | Input | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| UT-18 | Get all orders when data exists | None (seeded DB) | Returns 200 with `{ count, orders[] }` | Pass if status 200 and orders array is non-empty |
| UT-19 | Get all orders when store is empty | None (empty DB) | Returns 200 with `{ count: 0, orders: [] }` | Pass if status 200 and orders is empty array |

---

## 8. Unit Test Results (Module 12)

### 8.1 Execution Summary

| Metric | Value |
|--------|-------|
| Test Framework | Jest v29 |
| Test File | `tests/app.test.js` |
| Total Tests | 30 |
| Passed | 30 |
| Failed | 0 |
| Test Suites | 1 passed |
| Execution Time | ~2.2 seconds |

### 8.2 Code Coverage

| File   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines |
|--------|---------|----------|---------|---------|-----------------|
| app.js | 96.96   | 96.42    | 90      | 96.96   | 154–155         |

> Lines 154–155 are the `app.listen()` server start call. These are wrapped in a `require.main === module` guard and are excluded by design — untestable without starting a real server.

### 8.3 Individual Test Results

| Test ID | Description | Expected | Received | Result | Notes |
|---------|-------------|----------|----------|--------|-------|
| UT-01 | Create order — valid input | 201 | 201 | ✅ Pass | order fields + transactionId returned |
| UT-02 | Create order — missing customer | 400 | 400 | ✅ Pass | Missing required fields error |
| UT-03 | Create order — missing product | 400 | 400 | ✅ Pass | Missing required fields error |
| UT-04 | Create order — missing quantity | 400 | 400 | ✅ Pass | Missing required fields error |
| UT-05 | quantity = 0 (lower boundary) | 400 | 400 | ✅ Pass | quantity must be a positive integer |
| UT-06 | quantity = negative (-5) | 400 | 400 | ✅ Pass | quantity must be a positive integer |
| UT-07 | quantity = string "two" (wrong type) | 400 | 400 | ✅ Pass | quantity must be a positive integer |
| UT-08 | quantity = 1 (minimum valid boundary) | 201 | 201 | ✅ Pass | Order created with quantity 1 |
| UT-09 | DB insert throws | 500 | 500 | ✅ Pass | Internal server error + details returned |
| UT-10 | Payment gateway returns authorized: false | 402 | 402 | ✅ Pass | Payment authorization failed |
| UT-11 | Get all orders — data exists | 200 | 200 | ✅ Pass | count: 1, orders array returned |
| UT-12 | Get all orders — empty store | 200 | 200 | ✅ Pass | count: 0, empty orders array |
| UT-13 | Get all orders — count accuracy | 200 | 200 | ✅ Pass | count matches number of orders |
| UT-14 | Get all orders — DB throws | 500 | 500 | ✅ Pass | Internal server error |
| UT-15 | Get order by valid ID | 200 | 200 | ✅ Pass | Full order object returned |
| UT-16 | Get order — non-existent ID | 404 | 404 | ✅ Pass | Error message contains the ID |
| UT-17 | Get order — passes correct id to DB | 200 | 200 | ✅ Pass | mockGet called with correct id |
| UT-18 | Get order — DB throws | 500 | 500 | ✅ Pass | Internal server error |
| UT-19 | Update order — valid status | 200 | 200 | ✅ Pass | Updated order returned |
| UT-20 | Update order — all five valid statuses | 200 | 200 | ✅ Pass | All 5 statuses accepted and returned |
| UT-21 | Update order — missing status field | 400 | 400 | ✅ Pass | Missing required field: status |
| UT-22 | Update order — invalid status value | 400 | 400 | ✅ Pass | Invalid status error |
| UT-23 | Update order — wrong-cased status (edge case) | 400 | 400 | ✅ Pass | Case-sensitive validation enforced |
| UT-24 | Update order — non-existent ID | 404 | 404 | ✅ Pass | Error message contains the ID |
| UT-25 | Update order — DB throws | 500 | 500 | ✅ Pass | Internal server error |
| UT-26 | Delete existing order | 200 | 200 | ✅ Pass | Message contains order ID |
| UT-27 | Delete non-existent order | 404 | 404 | ✅ Pass | Error message contains the ID |
| UT-28 | Delete — DB throws on existence check | 500 | 500 | ✅ Pass | Internal server error + details |
| UT-29 | Delete — DB throws on delete | 500 | 500 | ✅ Pass | Internal server error + details |
| UT-30 | 404 fallback middleware | 404 | 404 | ✅ Pass | Route not found error returned |

### 8.4 Issues Encountered and Resolved

**Issue 1 — `quantity: 0` triggered wrong error message**
JavaScript's `!quantity` evaluates `0` as falsy, causing it to hit the "Missing required fields" guard before reaching the type/range check. Fixed by changing the condition in `app.js` to `quantity === undefined || quantity === null`.

**Issue 2 — Jest hung after test completion**
The `app.listen()` call on lines 154–155 kept an async handle open after tests finished, causing Jest to warn and not exit cleanly. Fixed by wrapping the call in `if (require.main === module)` so the server only starts when `app.js` is run directly, not when imported by tests.

**Issue 3 — 402 branch unreachable via normal mocking**
`simulatePaymentGateway` is a private function inside `app.js` that hardcodes `authorized: true`. Reaching the 402 branch required overriding `global.Promise` to intercept the internal promise and force `authorized: false`. This approach worked and the branch is now covered.

---

## 9. Integration Test Cases

### 9.1 Create → Read

| Test Case ID | Description | Steps | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| IT-01 | Create an order then retrieve it | POST `/orders` with valid body; GET `/orders/:id` using returned ID | GET returns the same order data as POST response | Pass if retrieved order matches created order |
| IT-02 | Create multiple orders and retrieve all | POST two orders; GET `/orders` | Response count matches DB row count, both orders in array | Pass if count increases by 2 and both appear in list |

### 9.2 Update

| Test Case ID | Description | Steps | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| IT-03 | Update order status and verify persistence | POST to create; PATCH `/orders/:id` with `{ "status": "Delivered" }`; GET `/orders/:id` | GET reflects updated status | Pass if GET returns `status: "Delivered"` |
| IT-04 | Update does not affect other records | POST two orders; PATCH first; GET second | Second order status unchanged | Pass if second order data is unmodified |

### 9.3 Delete

| Test Case ID | Description | Steps | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| IT-05 | Delete an order and confirm removal | POST to create; DELETE `/orders/:id`; GET `/orders/:id` | GET returns 404 | Pass if GET returns 404 after delete |
| IT-06 | Delete does not affect other records | POST two orders; DELETE first; GET second | Second order still returns 200 | Pass if second order is unaffected |
| IT-07 | Deleted order absent from list | POST two orders; DELETE first; GET `/orders` | List contains only second order | Pass if count decreased by 1 |

### 9.4 Error & Edge Cases

| Test Case ID | Description | Steps | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| IT-08 | Request with malformed JSON body | POST `/orders` with `Content-Type: application/json` but invalid JSON string | Returns 400 | Pass if status is 400 |
| IT-09 | Request to unknown route | GET `/nonexistent/route` | Returns 404 with error message | Pass if status is 404 |

### 9.5 Database Error Handling

| Test Case ID | Description | Steps | Expected Output | Pass/Fail Criteria |
|---|---|---|---|---|
| IT-10 | GET /orders with DB unavailable | Simulate DB failure; GET `/orders` | Returns 500 with error message | Pass if status is 500 |
| IT-11 | POST /orders with DB write failure | Simulate DB write failure during INSERT | Returns 500, no partial record created | Pass if status is 500 |
| IT-12 | PATCH /orders/:id with DB update failure | Simulate DB failure during UPDATE | Returns 500, original record unchanged | Pass if status is 500 |
| IT-13 | DELETE /orders/:id with DB failure | Simulate DB failure during DELETE | Returns 500, record still exists | Pass if status is 500 and GET still returns the order |

---

## 10. Postman Test Cases

All tests are organized in a Postman Collection named **"Order Management API"**. Each request maps to one endpoint.

### 10.1 POST /orders — Create Order

**Request setup:**
- Method: POST
- URL: `{{baseUrl}}/orders`
- Headers: `Content-Type: application/json`
- Body: `{ "customer": "Test User", "product": "Gadget", "quantity": 3 }`

```javascript
// PM-01: Status code is 201
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});

// PM-02: Response body has correct fields
pm.test("Response contains order fields", function () {
    var json = pm.response.json();
    pm.expect(json.order).to.be.an('object');
    pm.expect(json.order.customer).to.eql("Test User");
    pm.expect(json.order.product).to.eql("Gadget");
    pm.expect(json.order.quantity).to.eql(3);
    pm.expect(json.order.status).to.eql("Pending");
    pm.expect(json.transactionId).to.be.a('string');
});

// PM-03: Content-Type header is JSON
pm.test("Content-Type is application/json", function () {
    pm.response.to.have.header("Content-Type");
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});

// PM-04: Response time is acceptable
pm.test("Response time is below 1000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});

// Save ID for later requests
pm.collectionVariables.set("orderId", pm.response.json().order.id);
```

### 10.2 GET /orders — Get All Orders

```javascript
// PM-05: Status code is 200
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

// PM-06: Response has orders array and count
pm.test("Response body has orders array and count", function () {
    var json = pm.response.json();
    pm.expect(json.orders).to.be.an("array");
    pm.expect(json.count).to.be.a("number");
});

// PM-07: Response time
pm.test("Response time is below 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

### 10.3 GET /orders/:id — Get Single Order

```javascript
// PM-08: Status code is 200
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

// PM-09: Response body matches created order
pm.test("Response body contains correct order data", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.eql(pm.collectionVariables.get("orderId"));
    pm.expect(json.customer).to.eql("Test User");
    pm.expect(json.product).to.eql("Gadget");
    pm.expect(json.quantity).to.eql(3);
});
```

### 10.4 GET /orders/:id — Not Found (404)

```javascript
// PM-10: Status code is 404
pm.test("Status code is 404 Not Found", function () {
    pm.response.to.have.status(404);
});

// PM-11: Response body contains error message
pm.test("Response body contains error info", function () {
    var json = pm.response.json();
    pm.expect(json.error).to.include("not found");
});
```

### 10.5 PATCH /orders/:id — Update Order Status

```javascript
// PM-12: Status code is 200
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

// PM-13: Updated status is reflected in response
pm.test("Status was updated to Shipped", function () {
    var json = pm.response.json();
    pm.expect(json.order.status).to.eql("Shipped");
});

// PM-14: Other fields unchanged
pm.test("Other fields are unchanged", function () {
    var json = pm.response.json();
    pm.expect(json.order.customer).to.eql("Test User");
    pm.expect(json.order.product).to.eql("Gadget");
});
```

### 10.6 PATCH /orders/:id — Invalid Status (400)

```javascript
// PM-15: Status code is 400
pm.test("Status code is 400 Bad Request", function () {
    pm.response.to.have.status(400);
});

// PM-16: Error message mentions invalid status
pm.test("Error message mentions invalid status", function () {
    pm.expect(pm.response.json().error).to.include("Invalid status");
});
```

### 10.7 DELETE /orders/:id — Delete Order

```javascript
// PM-17: Status code is 200
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

// PM-18: Deletion confirmed in response
pm.test("Response confirms deletion", function () {
    pm.expect(pm.response.json().message).to.include("deleted");
});

// PM-19: Response time
pm.test("Response time is below 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

### 10.8 GET /orders/:id — Confirm Deleted (404)

```javascript
// PM-20: Status code is 404 after deletion
pm.test("Deleted order returns 404", function () {
    pm.response.to.have.status(404);
});
```

### 10.9 POST /orders — Invalid Input (400)

```javascript
// PM-21: Status code is 400
pm.test("Status code is 400 Bad Request", function () {
    pm.response.to.have.status(400);
});

// PM-22: Response body contains error
pm.test("Response body contains an error message", function () {
    var json = pm.response.json();
    pm.expect(json.error).to.be.a('string');
});
```

### 10.10 Intentional Failures

```javascript
// PM-23: Response time below 100ms — intentionally fails due to ~500ms payment gateway delay
pm.test("Response time is below 100ms (expected to fail - payment gateway adds ~500ms delay)", function () {
    pm.expect(pm.response.responseTime).to.be.below(100);
});

// PM-24: Expects 200 — intentionally fails because API correctly returns 201 for creation
pm.test("Status code is 200 (expected to fail - API returns 201 for creation)", function () {
    pm.response.to.have.status(200);
});

// PM-25: Expects Processing — intentionally fails because new orders default to Pending
pm.test("Status is Processing (expected to fail - new orders start as Pending not Processing)", function () {
    pm.expect(pm.response.json().status).to.eql("Processing");
});
```

---

## 11. Postman Test Results

| Test ID | Test Name | Endpoint | Status Code Expected | Status Code Received | Pass/Fail | Notes |
|---------|-----------|----------|----------------------|----------------------|-----------|-------|
| PM-01 | Status code is 201 Created | POST /orders | 201 | 201 | ✅ Pass | |
| PM-02 | Response contains order fields | POST /orders | — | All fields present | ✅ Pass | |
| PM-03 | Content-Type is application/json | POST /orders | — | application/json | ✅ Pass | |
| PM-04 | Response time below 1000ms | POST /orders | < 1000ms | ~558ms | ✅ Pass | Payment gateway adds ~500ms |
| PM-05 | Status code is 200 OK | GET /orders | 200 | 200 | ✅ Pass | |
| PM-06 | Response has orders array and count | GET /orders | — | Array and count returned | ✅ Pass | |
| PM-07 | Response time below 500ms | GET /orders | < 500ms | ~6ms | ✅ Pass | |
| PM-08 | Status code is 200 OK | GET /orders/:id | 200 | 200 | ✅ Pass | |
| PM-09 | Response body matches created order | GET /orders/:id | — | Fields match | ✅ Pass | |
| PM-10 | Status code is 404 Not Found | GET /orders/:id (bad UUID) | 404 | 404 | ✅ Pass | |
| PM-11 | Response body contains error info | GET /orders/:id (bad UUID) | — | `error` field present | ✅ Pass | |
| PM-12 | Status code is 200 OK | PATCH /orders/:id | 200 | 200 | ✅ Pass | |
| PM-13 | Status updated to Shipped | PATCH /orders/:id | — | `status: "Shipped"` | ✅ Pass | |
| PM-14 | Other fields unchanged | PATCH /orders/:id | — | customer/product unchanged | ✅ Pass | |
| PM-15 | Status code is 400 Bad Request | PATCH /orders/:id (invalid) | 400 | 400 | ✅ Pass | |
| PM-16 | Error message mentions invalid status | PATCH /orders/:id (invalid) | — | `error` includes "Invalid status" | ✅ Pass | |
| PM-17 | Status code is 200 OK | DELETE /orders/:id | 200 | 200 | ✅ Pass | |
| PM-18 | Response confirms deletion | DELETE /orders/:id | — | message includes "deleted" | ✅ Pass | |
| PM-19 | Response time below 500ms | DELETE /orders/:id | < 500ms | ~23ms | ✅ Pass | |
| PM-20 | Deleted order returns 404 | GET /orders/:id (deleted) | 404 | 404 | ✅ Pass | |
| PM-21 | Status code is 400 Bad Request | POST /orders (invalid) | 400 | 400 | ✅ Pass | |
| PM-22 | Response body contains error message | POST /orders (invalid) | — | `error` field present | ✅ Pass | |
| PM-23 | Response time below 100ms | POST /orders | < 100ms | ~528ms | ❌ Fail | Expected — payment gateway simulation adds ~500ms latency by design |
| PM-24 | Status code is 200 on create | POST /orders | 200 | 201 | ❌ Fail | Expected — API correctly returns 201 Created for new resources per REST convention |
| PM-25 | New order status is Processing | GET /orders/:id | — | `status: "Pending"` | ❌ Fail | Expected — confirms new orders never initialize as "Processing" |

**Summary:** 22 / 25 Postman tests passed. 3 intentional failures documented above. 30 / 30 Jest unit tests passed.

> **Intentional Failure Analysis:** The 3 failures were designed to validate specific API behaviors — the payment gateway latency constraint, the use of 201 for correct status code numbering on resource creation, and the initial order status value of Pending.
