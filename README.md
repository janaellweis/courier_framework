# Courier Integration Framework

A NestJS and TypeScript project that provides a common way to work with different shipping couriers. It uses PostgreSQL and Prisma to store shipment information.

## Overview

Courier providers can have different APIs, shipment statuses, and supported operations. Instead of writing separate application logic for every provider, this project uses a shared `Courier` interface and an adapter for each courier.

The framework supports creating waybills, getting printable HTML labels, and tracking shipments. Cancellation is optional because not every courier supports it.

**A proof of the concept.** SMSA and Aramex are mock implementations, and the HTTP adapter connects to a locally simulated courier server—not a real shipping provider.

## Couriers and features

| Courier  | Implementation      | Create| Label | Track| Cancel|
| ---      | ---                 | ---   | ---   | ---  | ---   |
| `SMSA`   | `MockSmsaAdapter`   | Yes   | Yes   | Yes  | Yes   |
| `ARAMEX` | `MockAramexAdapter` | Yes   | Yes.  | Yes  | No    |
| `HTTP`   | `HttpCourierAdapter`| Yes   | Yes   | Yes  | No    |

## How it works

The main parts of the application are:

- **`Courier` interface:** Defines the required waybill, label, and tracking methods.
- **`CancellableCourier` interface:** Adds cancellation only for couriers that support it.
- **Adapters:** Handle each courier's behavior and convert its statuses to shared values.
- **`CourierRegistry`:** Finds the adapter for a requested courier.
- **`CourierService`:** Coordinates operations and saves or updates shipments using Prisma.
- **`CourierController`:** Exposes the REST endpoints.

For example, when a client creates a waybill, the controller receives the request, the service gets the right adapter from the registry, and the adapter creates the waybill. The service then saves the shipment details in PostgreSQL and returns the result.

The shared shipment statuses are `CREATED`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `FAILED`, and `UNKNOWN`.

If a shipment is already marked `DELIVERED` or `CANCELLED` in the database, tracking returns that final status rather than overwriting it with an older courier response. An unrecognized courier status can be represented as `UNKNOWN`.

### Why I used this design

The main goal was to make it easier to add another courier without rewriting the controller or service. Each adapter handles courier-specific details, while the rest of the application uses the same methods. The registry keeps courier selection in one place. Adding a courier still requires registering its adapter in the registry and NestJS module.

I used PostgreSQL to keep shipment records across application restarts and Prisma for database access, schema management, and migrations.

## Setup

### Requirements

- Node.js and npm
- PostgreSQL

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

Create a PostgreSQL database called `courier_framework`:

```bash
createdb courier_framework
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/courier_framework?schema=public"
```

Replace the placeholders with your PostgreSQL credentials. **Do not commit `.env` or real credentials.**

### 3. Apply migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Start the application

```bash
npm run start:dev
```

The API runs at `http://localhost:3000`.

For the `HTTP` courier, start the simulated courier server in a separate terminal:

```bash
npm run start:mock-courier
```

It runs at `http://localhost:3001`. The `SMSA` and `ARAMEX` mocks do not need this extra server.

## API endpoints

Base URL: `http://localhost:3000`

| Method  | Endpoint | Purpose |
| ---     | ---      | ---     |
| `POST`  | `/couriers/:courierName/waybills` | Create a waybill |
| `GET`   | `/couriers/:courierName/waybills/:waybillId/label` | Get a printable HTML label |
| `GET`   | `/couriers/:courierName/waybills/:waybillId/tracking` | Get the shipment status |
| `DELETE`| `/couriers/:courierName/waybills/:waybillId` | Cancel a shipment if supported |

Use `SMSA`, `ARAMEX`, or `HTTP` as the courier name (case-insensitive).

### Example: create a waybill

**Request**

```http
POST /couriers/SMSA/waybills
Content-Type: application/json
```

```json
{
  "orderNumber": "ORDER-1001",
  "sender": {
    "name": "Ahmed",
    "phone": "0501234567",
    "address": {
      "city": "Riyadh",
      "street": "King Fahd Road",
      "country": "Saudi Arabia"
    }
  },
  "recipient": {
    "name": "Sara",
    "phone": "0551234567",
    "address": {
      "city": "Jeddah",
      "street": "Tahlia Street",
      "country": "Saudi Arabia"
    }
  },
  "packages": [{ "weightKg": 2.5 }]
}
```

**Example response (`201 Created`)**

```json
{
  "waybillId": "ORDER-1001",
  "trackingNumber": "SMSA-ORDER-1001",
  "status": "CREATED"
}
```

Other example requests:

```http
GET /couriers/SMSA/waybills/ORDER-1001/label
GET /couriers/SMSA/waybills/ORDER-1001/tracking
DELETE /couriers/SMSA/waybills/ORDER-1001
```

The label endpoint returns printable HTML, not an official courier PDF. Tracking returns a shared status such as `"IN_TRANSIT"`. Cancellation is supported by the SMSA mock only.

## Validation and error handling

The application uses NestJS validation for required shipment details, nested addresses, package weights, and unexpected fields.

Common responses include:

| Status | Example |
| --- | --- |
| `400 Bad Request` | Invalid input or unsupported cancellation |
| `404 Not Found` | Unknown courier or missing shipment |
| `409 Conflict` | Duplicate waybill |
| `502 Bad Gateway` | Simulated HTTP courier failure |
| `504 Gateway Timeout` | Simulated HTTP courier timeout |

PostgreSQL has a unique constraint on `(courier, waybillId)`. When Prisma reports a duplicate record error (`P2002`), the service returns `409 Conflict`.

### HTTP adapter retries

The HTTP adapter uses Axios to call the local simulator. Requests have a **5-second timeout**. Tracking and label requests can be retried for temporary errors (timeouts, connection resets, HTTP `429`, or HTTP `5xx`), with **up to three total attempts**. The delays are 500 ms and 1,000 ms between attempts.

Waybill creation is **not retried automatically** because repeating a POST request could create a duplicate waybill.

## Tests

Run the tests and build with:

```bash
npm test -- --runInBand
npm run build
```

The Jest tests cover courier behavior, cancellation rules, preserving final statuses, duplicate database errors, and HTTP retry/error handling. I also manually tested the main API operations against the simulated couriers.


## Adding another courier

To add a courier such as DHL:

1. Create an adapter in `src/courier/adapters/` that implements `Courier`.
2. Implement waybill creation, label retrieval, and tracking, including status mapping.
3. Implement `CancellableCourier` if the provider supports cancellation.
4. Register the adapter in `CourierRegistry` and `CourierModule`.
5. Add tests for the new adapter.

The common controller endpoints and service flow can stay the same.

## Limitations and future improvements

This project demonstrates the framework design rather than a complete production shipping integration.

- SMSA and Aramex are mocks. The HTTP adapter talks to a local simulator, not a live courier.
- Labels and tracking responses are simulated.
- The HTTP simulator keeps its data in memory, so restarting it clears its waybills even though PostgreSQL records remain.
- Waybill creation can partially succeed: the courier might create a waybill even if saving it to PostgreSQL fails. The database constraint does not undo the external operation.
- There are no background workers, queues, authentication, or production monitoring in this proof of concept.

With more time, I would integrate a real courier sandbox API, add idempotency and recovery handling for partial failures, improve logging and automated integration tests, and consider queues for higher shipment volumes.
