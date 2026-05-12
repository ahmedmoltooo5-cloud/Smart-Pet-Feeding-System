# Smart Pet Feeder

Full-stack IoT Smart Pet Feeder built around your existing React frontend, with an Express backend, MQTT bridge, Microsoft SQL Server in Docker, Socket.IO live updates, and an ESP32 hardware sketch aligned to the same MQTT topic contract.

## Architecture

`ESP32 <-> HiveMQ Cloud <-> Node.js/Express <-> SQL Server <-> React frontend`

## What is included

- Existing frontend kept in place and rewired away from localStorage
- Express backend with JWT auth and bcrypt password hashing
- Sequelize models for SQL Server with automatic table creation
- Dockerized SQL Server for local development
- Socket.IO realtime updates for dashboard and history
- MQTT integration for HiveMQ Cloud publish/subscribe
- ESP32 sketch updated to publish sensor data and receive backend commands
- SQL schema artifact, environment template, and setup guide

## Project structure

```text
backend/
  config/
  controllers/
  database/
  middleware/
  models/
  mqtt/
  routes/
  services/
  sockets/
  utils/
src/
  app/
    components/
    context/
    services/
  styles/
sketch_may8a/
docker-compose.yml
```

## Environment setup

1. Copy `.env.example` to `.env`.
2. Set your SQL Server password, JWT secret, and HiveMQ Cloud credentials.
3. Keep `CLIENT_ORIGIN=http://localhost:5173` unless you change the Vite port.

## Install and run

1. Install dependencies:

```bash
npm install
```

2. Start SQL Server in Docker:

```bash
npm run db:up
```

3. Start frontend and backend together:

```bash
npm run dev
```

4. The frontend runs on `http://localhost:5173` and the backend on `http://localhost:4000`.

## Azure Data Studio connection

Use these values in Azure Data Studio:

- Server: `localhost`
- Port: `1433`
- Authentication Type: `SQL Login`
- User name: `sa`
- Password: the `DB_PASSWORD` from your `.env`
- Database: `SmartPetFeeder`
- Encrypt: optional for local Docker, depending on your client preference

The backend automatically creates the database and tables on startup. The reference schema is in [backend/database/schema.sql](backend/database/schema.sql).

## MQTT topics

- `petfeeder/presence`
- `petfeeder/foodlevel`
- `petfeeder/dispense`
- `petfeeder/system`
- `petfeeder/history`
- `petfeeder/schedule`

### Example backend command payloads

Dispense:

```json
{
  "command": "dispense",
  "correlationId": "uuid",
  "userId": 1,
  "petName": "Milo",
  "feedingType": "manual",
  "dispenseAmount": 1
}
```

System:

```json
{
  "command": "stop",
  "requestedByUserId": 1
}
```

Schedule:

```json
{
  "action": "update",
  "schedule": {
    "id": 1,
    "feedingTime": "08:00",
    "enabled": true,
    "repeatMode": "daily"
  }
}
```

### Example ESP32 sensor payloads

Presence:

```json
{
  "petDetected": true
}
```

Food level:

```json
{
  "foodLevel": 67
}
```

History confirmation:

```json
{
  "correlationId": "uuid",
  "petName": "Milo",
  "feedingType": "manual",
  "dispenseAmount": 1,
  "foodLevel": 62,
  "status": "dispensed"
}
```

## API summary

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`

### History

- `GET /api/history?search=&feedingType=&sort=desc`
- `DELETE /api/history/:id`

### Schedules

- `GET /api/schedules`
- `POST /api/schedules`
- `PUT /api/schedules/:id`
- `DELETE /api/schedules/:id`

### System

- `GET /api/system/status`
- `GET /api/system/sensors?limit=50`
- `POST /api/system/dispense`
- `POST /api/system/start`
- `POST /api/system/stop`

## Frontend integration notes

- Login and signup now call the backend instead of localStorage.
- JWT session data is stored in localStorage and validated on reload.
- Dashboard indicators subscribe to live Socket.IO updates pushed from MQTT activity.
- History loads from SQL-backed APIs and updates in realtime when dispensing events arrive.
- The schedule modal writes to the backend while preserving the same UI flow.

## ESP32 setup notes

- The updated sketch is at [sketch_may8a.ino](sketch_may8a/sketch_may8a.ino).
- Install these Arduino libraries before flashing:
  - `PubSubClient`
  - `ESP32Servo`
  - `ArduinoJson`
- Replace the placeholder Wi-Fi and HiveMQ credentials in the sketch before uploading.
- Adjust `SERVO_PIN`, `FOOD_LEVEL_PIN`, `PIR_SENSOR_PIN`, and the food-level analog calibration for your exact wiring.

## Recommended next checks

1. Start Docker SQL Server and confirm the backend creates tables.
2. Verify HiveMQ credentials in `.env`.
3. Flash the updated ESP32 sketch with your real pins and credentials.
4. Create an account in the UI and confirm dashboard + history update live.
