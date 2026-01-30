# Real-time Event Processing & Analytics (Senior Interview Exercise)

This repository contains an advanced Node.js exercise for **senior-level technical interviews**.

The exercise builds upon a webhook ingestion system and adds:
- **Event deduplication** to prevent duplicate processing
- **Advanced aggregations** (trends, statistics)

You will have **60 minutes** to implement the core functionality during the interview.

---

## 1. Getting Started

```bash
git clone <REPO_URL>
cd realtime-event-processing-exercise

npm install
npm start
# or, during development:
npm run dev
```

Server runs on: `http://localhost:3000`

Test health endpoint:
```bash
curl http://localhost:3000/health
```

---

## 2. Code Structure

**Main files:**
- `src/server.js` – Express app
  - In-memory `events` array
  - `seenEventIds` Set for deduplication tracking

---

## 3. Data Model

Webhook event structure:

```json
{
  "eventId": "evt_123",
  "source": "queue-1",
  "metric": "jobs_completed",
  "value": 5,
  "timestamp": "2025-01-01T10:00:00Z",
  "metadata": {
    "region": "us-east-1",
    "priority": "high"
  }
}
```

### Required Fields

| Field       | Type   | Description                                          |
|-------------|--------|------------------------------------------------------|
| `eventId`   | string | Unique identifier (used for deduplication)          |
| `source`    | string | Source identifier (e.g. queue name, service name)   |
| `metric`    | string | Metric name (e.g. `"jobs_completed"`, `"latency"`)  |
| `value`     | number | Numeric value                                        |
| `timestamp` | string | ISO 8601 timestamp (UTC)                            |
| `metadata`  | object | Optional key-value pairs for additional context      |

---

## 4. Tasks (60 minutes)

| Task | Endpoint                    | Status      |
|------|-----------------------------|-------------|
| 1    | `POST /webhook`             | **Required**|
| 2    | `GET /wallboard`            | **Required**|
| 3    | `GET /metrics/:source`      | **Required**|
| 4    | `DELETE /events/:eventId`   | Optional    |

---

### Task 1 – POST /webhook (Required)

**Endpoint:**
```http
POST /webhook
Content-Type: application/json
```

**Requirements:**

1. **Accept single event or array of events** (same as base exercise)

2. **Validate required fields:**
   - `eventId`, `source`, `metric`, `value`, `timestamp`
   - `value` must be a number
   - `timestamp` must be a valid ISO 8601 string
   - `metadata` is optional but must be an object if present

3. **Deduplication:**
   - Check if `eventId` already exists in `seenEventIds` Set
   - If duplicate, skip storing
   - Return response indicating duplicates were skipped:
     ```json
     {
       "status": "ok",
       "received": 5,
       "stored": 3,
       "duplicates": 2
     }
     ```

4. **Store valid events:**
   - Add to `events` array
   - Add `eventId` to `seenEventIds` Set

**Error Responses:**
- `400 Bad Request` – Invalid payload or missing required fields

---

### Task 2 – GET /wallboard (Required)

**Endpoint:**
```http
GET /wallboard
```

**Requirements:**

1. **Aggregate by metric:**
   - Group all events by `metric`
   - For each metric, calculate:
     - `eventCount` – Total events for this metric
     - `lastValue` – Value from most recent event (by timestamp)
     - `avgValue` – Average of all values
     - `minValue` – Minimum value
     - `maxValue` – Maximum value
     - `trend` – "up", "down", or "stable" based on comparing last 10 events vs previous 10 events

2. **Trend calculation (detailed):**
   
   The trend indicates whether the metric values are increasing, decreasing, or remaining stable over time.
   
   **Algorithm:**
   - Get all events for the metric, sorted by `timestamp` in ascending order (oldest first)
   - If there are fewer than 20 events total:
     - If fewer than 10 events: return `"stable"` (insufficient data)
     - If 10-19 events: use all available events, split in half (first half vs second half)
   - If there are 20 or more events:
     - Take the last 20 events (most recent)
     - Split into two groups:
       - **Previous 10**: Events at positions 0-9 (older half)
       - **Last 10**: Events at positions 10-19 (newer half)
   - Calculate the average `value` for each group:
     - `previousAvg` = average of values in Previous 10 group
     - `recentAvg` = average of values in Last 10 group
   - Calculate percentage change:
     - `percentChange = ((recentAvg - previousAvg) / previousAvg) * 100`
   - Determine trend:
     - If `percentChange > 10`: return `"up"` (significant increase)
     - If `percentChange < -10`: return `"down"` (significant decrease)
     - Otherwise: return `"stable"` (change is within ±10% threshold)
   
   **Example:**
   - Previous 10 events: [5, 6, 5, 7, 6, 5, 6, 5, 6, 5] → average = 5.6
   - Last 10 events: [8, 9, 8, 10, 9, 8, 9, 8, 9, 8] → average = 8.6
   - Percent change: ((8.6 - 5.6) / 5.6) * 100 = 53.6% → `"up"`
   
   **Edge Cases:**
   - If `previousAvg` is 0, use absolute difference instead of percentage
   - If absolute difference > 1: `"up"`, else `"stable"`

3. **Response format:**
```json
{
  "totalEvents": 150,
  "lastUpdated": "2025-01-01T10:30:00Z",
  "metrics": [
    {
      "metric": "jobs_completed",
      "eventCount": 75,
      "lastValue": 12,
      "avgValue": 8.5,
      "minValue": 1,
      "maxValue": 25,
      "trend": "up"
    }
  ]
}
```

---


### Task 3 – GET /metrics/:source (Required)

**Endpoint:**
```http
GET /metrics/:source
```

**Query Parameters:**
- `metric` (optional) – Filter by specific metric
- `limit` (optional) – Limit number of events returned (default: 50)

**Requirements:**

1. **Filter events by source:**
   - Return only events where `source` matches `:source` parameter

2. **Optional metric filter:**
   - If `metric` query param provided, further filter by metric name

3. **Response format:**
```json
{
  "source": "queue-1",
  "totalEvents": 45,
  "metrics": {
    "jobs_completed": 30,
    "jobs_failed": 15
  },
  "recentEvents": [
    { /* event objects */ }
  ]
}
```

---

### Task 4 – DELETE /events/:eventId (Optional)

**Endpoint:**
```http
DELETE /events/:eventId
```

**Requirements:**

1. **Find and remove event:**
   - Remove event with matching `eventId` from `events` array
   - Remove `eventId` from `seenEventIds` Set

2. **Response:**
   - `200 OK` if deleted
   - `404 Not Found` if event doesn't exist

---

## 5. Example Requests

### Send single event
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt_1",
    "source": "queue-1",
    "metric": "jobs_completed",
    "value": 5,
    "timestamp": "2025-01-01T10:00:00Z",
    "metadata": { "region": "us-east-1" }
  }'
```

### Send multiple events
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '[
    {
      "eventId": "evt_1",
      "source": "queue-1",
      "metric": "jobs_completed",
      "value": 5,
      "timestamp": "2025-01-01T10:00:00Z"
    },
    {
      "eventId": "evt_1",
      "source": "queue-1",
      "metric": "jobs_completed",
      "value": 5,
      "timestamp": "2025-01-01T10:00:00Z"
    }
  ]'
```

### Get wallboard
```bash
curl http://localhost:3000/wallboard
```

### Get source metrics
```bash
curl http://localhost:3000/metrics/queue-1?metric=jobs_completed&limit=10
```

---

## 6. Implementation Notes

**Key Challenges:**
- Efficient deduplication (Set lookup is O(1))
- Trend calculation with proper handling of edge cases

**Performance Considerations:**
- Use Set for O(1) deduplication checks
- Consider limiting events array size if memory is a concern (optional)

**Error Handling:**
- Validate all inputs
- Return meaningful error messages
- Handle edge cases in trend calculation (zero averages, insufficient data)

---

> 💡 **Focus on:**
> - Clean code structure
> - Efficient algorithms
> - Proper error handling
> - Accurate trend calculation with edge case handling
> - Performance optimizations

