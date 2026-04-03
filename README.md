## Setup & Installation

**Prerequisites:** Node.js v18+
```bash
# 1. Install dependencies
npm install
# 2. Start server
npm start
```
The server runs on `http://localhost:3000` 

---

## Endpoints

### POST /orders
Creates a new order.

**Request Body**
```json
{
  "customer": "Jane Smith",
  "product": "Wireless Keyboard",
  "quantity": 2
}
```

**Success Response — 201 Created**
```json
{
    "message": "Order created successfully",
    "transactionId": "18967a73-7e89-4407-827b-25a1008e20e3", #randomized
    "order": {
        "id": "417bacd4-0d88-4680-9997-0ae92a188059", #randomized
        "customer": "Jane Smith",
        "product": "Wireless Keyboard",
        "quantity": 2,
        "status": "Pending",
        "created_at": "2026-03-29T18:06:58.819Z"
    }
}
```

**Error Responses**

| Status | Reason |
| 400 | Missing required fields or invalid quantity |
| 402 | Payment authorization failed |
| 500 | Internal server error |

---

### GET /orders
Returns all orders, sorted by creation date (newest first).

**Success Response — 200 OK**
```json
{
    "count": 2,
    "orders": [
        {
            "id": "417bacd4-0d88-4680-9997-0ae92a188059", #randomized
            "customer": "Jane Smith",
            "product": "Wireless Keyboard",
            "quantity": 2,
            "status": "Pending",
            "created_at": "2026-03-29T18:06:58.819Z"
        },
        {
            "id": "de835736-0ab7-4e47-baa8-81275eac82e8", #randomized
            "customer": "Jane Smith",
            "product": "Wireless Keyboard",
            "quantity": 2,
            "status": "Pending",
            "created_at": "2026-03-29T17:58:15.558Z"
        }
    ]
}
```

---

### GET /orders/:id
Retrieves a single order by its ID.

**URL Parameters**

| Parameter | Type | Description |
| `id` | string (ID) | The order's ID |

**Success Response — 200 OK**
```json
{
    "id": "de835736-0ab7-4e47-baa8-81275eac82e8", #randomized
    "customer": "Jane Smith",
    "product": "Wireless Keyboard",
    "quantity": 2,
    "status": "Pending",
    "created_at": "2026-03-29T17:58:15.558Z"
}
```

**Error Responses**

| Status | Reason |
| 404 | not found |
| 500 | Internal server error |

---

### PATCH /orders/:id
Updates the status of an existing order.

**URL Parameters**

| Parameter | Type | Description |
| `id` | string (ID) | The order's ID |

**Valid Status Values:** `Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`

**Request Body**
```json
{
  "status": "Shipped"
}
```

**Success Response — 200 OK**
```json
{
    "message": "Order status updated",
    "order": {
        "id": "88179a44-df7e-4035-ad1a-1658dd656f6c", #randomized
        "customer": "Jane Smith",
        "product": "Wireless Keyboard",
        "quantity": 2,
        "status": "Shipped",
        "created_at": "2026-03-29T00:56:31.749Z"
    }
}
```

**Error Responses**

| Status | Reason |
| 400 | Missing field or invalid value |
| 404 | Order not found |
| 500 | Internal server error |

---

### DELETE /orders/:id
Permanently removes an order.

**URL Parameters**

| Parameter | Type |         Description        |
| `id` | string (ID) | The order's ID |

**Success Response — 200 OK**
```json
{
    "message": "Order '88179a44-df7e-4035-ad1a-1658dd656f6c' successfully deleted" 
}
```

**Error Responses**

| Status | Reason |
| 404 | not found |
| 500 | Internal server error |

---

## HTTP Code Summary

| Code | Meaning | Used When |
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Missing/invalid fields |
| 402 | Payment Required | Payment gateway rejection |
| 404 | Not Found | Order ID doesn't exist |
| 500 | Internal Server Error | Unexpected server failure |

---
