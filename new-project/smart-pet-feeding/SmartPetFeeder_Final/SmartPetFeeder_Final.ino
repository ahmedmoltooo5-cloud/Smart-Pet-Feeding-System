/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║          SMART PET FEEDER — FINAL PRODUCTION CODE               ║
 * ║          Arab Academy for Science and Technology                ║
 * ║          ECE4302 — Advanced Networks | IoT Project              ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  VERSION   : 2.0 — Final Integrated Build                       ║
 * ║  PLATFORM  : ESP32                                              ║
 * ║  BROKER    : HiveMQ Cloud (MQTT over TLS)                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * ──────────────────────────────────────────────────────────────────
 *  SYSTEM ARCHITECTURE
 * ──────────────────────────────────────────────────────────────────
 *
 *   [Pet Detection Sensor] ──→  ESP32 ──MQTT──→ HiveMQ Cloud
 *   [Food Level Sensor]    ──→   │                    │
 *   [Servo Motor]          ←───  │             ┌──────┴───────┐
 *   [LED + Buzzer]         ←───  │          Node.js       React.js
 *                                │          Backend        Frontend
 *                                └──→  Serial Monitor (Debug)
 *
 * ──────────────────────────────────────────────────────────────────
 *  HARDWARE CONNECTIONS
 * ──────────────────────────────────────────────────────────────────
 *
 *  HC-SR04 #1 — PET DETECTION SENSOR
 *    VCC  → 3.3V (or 5V external)
 *    GND  → GND
 *    TRIG → GPIO 5  (D5)
 *    ECHO → GPIO 18 (D18)
 *
 *  HC-SR04 #2 — FOOD LEVEL SENSOR
 *    VCC  → 3.3V (or 5V external)
 *    GND  → GND
 *    TRIG → GPIO 19 (D19)
 *    ECHO → GPIO 21 (D21)
 *
 *  SG90 SERVO MOTOR
 *    VCC    → 5V (external supply recommended for stability)
 *    GND    → GND (shared with ESP32 GND)
 *    Signal → GPIO 15 (D15)
 *
 *  LED (Warning Indicator)
 *    Anode (+) → GPIO 2  (D2)  via 220Ω resistor
 *    Cathode (−) → GND
 *
 *  BUZZER (Active Buzzer)
 *    Positive (+) → GPIO 23 (D23)
 *    Negative (−) → GND
 *
 * ──────────────────────────────────────────────────────────────────
 *  MQTT TOPICS
 * ──────────────────────────────────────────────────────────────────
 *
 *  PUBLISH  (ESP32 → Broker → Frontend/Backend)
 *    petfeeder/petDetected    → "true" / "false"
 *    petfeeder/foodLevel      → "75.3"  (percentage as string)
 *    petfeeder/lowFoodAlert   → "true" / "false"
 *    petfeeder/servoStatus    → "OPEN"  / "CLOSED"
 *
 *  SUBSCRIBE  (Frontend/Backend → Broker → ESP32)
 *    petfeeder/manualDispense → "DISPENSE" (triggers servo)
 *
 * ──────────────────────────────────────────────────────────────────
 *  LIBRARIES REQUIRED  (Install via Arduino IDE Library Manager)
 * ──────────────────────────────────────────────────────────────────
 *    • ESP32Servo   — by Kevin Harrington
 *    • PubSubClient — by Nick O'Leary
 *    • WiFi.h       — built-in ESP32 core
 *
 * ──────────────────────────────────────────────────────────────────
 *  NOTE ON TIME / FEEDING SCHEDULE
 * ──────────────────────────────────────────────────────────────────
 *  This code uses NTP (Network Time Protocol) to get real time from
 *  the internet after WiFi connects. No RTC module required.
 *  Time zone is configurable via UTC_OFFSET_SECONDS below.
 *
 * ──────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════════
//  LIBRARIES
// ═══════════════════════════════════════════════════════════════════
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <time.h>              // For NTP time sync


// ═══════════════════════════════════════════════════════════════════
//  WIFI CREDENTIALS  ← EDIT HERE
// ═══════════════════════════════════════════════════════════════════
const char* WIFI_SSID     = "Moltoo";
const char* WIFI_PASSWORD = "123456789";


// ═══════════════════════════════════════════════════════════════════
//  HIVEMQ BROKER SETTINGS  ← EDIT HERE
// ═══════════════════════════════════════════════════════════════════
// Free HiveMQ Cloud cluster details (from your HiveMQ Cloud account)
const char* MQTT_BROKER   = "378859c67381496fa5ae270166684cc9.s1.eu.hivemq.cloud";
const int   MQTT_PORT     = 8883;            // Use 8883 for TLS
const char* MQTT_USERNAME = "ahmedmoltoo";
const char* MQTT_PASSWORD = "Moltoo2005";
const char* MQTT_CLIENT_ID = "SmartPetFeeder_ESP32";


// ═══════════════════════════════════════════════════════════════════
//  MQTT TOPICS
// ═══════════════════════════════════════════════════════════════════
const char* TOPIC_PET_DETECTED    = "petfeeder/petDetected";
const char* TOPIC_FOOD_LEVEL      = "petfeeder/foodLevel";
const char* TOPIC_LOW_FOOD_ALERT  = "petfeeder/lowFoodAlert";
const char* TOPIC_MANUAL_DISPENSE = "petfeeder/manualDispense";
const char* TOPIC_SERVO_STATUS    = "petfeeder/servoStatus";


// ═══════════════════════════════════════════════════════════════════
//  PIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

// HC-SR04 #1 — Pet Detection
#define PET_TRIG_PIN     5
#define PET_ECHO_PIN     18

// HC-SR04 #2 — Food Level
#define FOOD_TRIG_PIN    19
#define FOOD_ECHO_PIN    21

// Servo Motor
#define SERVO_PIN        15

// LED (Low Food Warning)
#define LED_PIN          2

// Buzzer (Low Food Alarm)
#define BUZZER_PIN       23


// ═══════════════════════════════════════════════════════════════════
//  SYSTEM CONFIGURATION  ← Easy to edit
// ═══════════════════════════════════════════════════════════════════

// --- Pet Detection ---
#define PET_DETECT_THRESHOLD_CM    20      // Distance to consider pet present (cm)
#define PET_CONFIRM_READS          3       // Consecutive readings needed to confirm pet

// --- Servo ---
#define SERVO_OPEN_ANGLE           180     // Degrees when food door is open
#define SERVO_CLOSED_ANGLE         0       // Degrees when food door is closed
#define SERVO_OPEN_DURATION_MS     3000    // How long servo stays open (ms)

// --- Food Container ---
#define CONTAINER_HEIGHT_CM        15      // Full container height (cm), sensor to bottom when EMPTY
#define LOW_FOOD_THRESHOLD_PERCENT 25.0    // Alert if food drops below this %

// --- Sensor Stability ---
#define SENSOR_READ_ATTEMPTS       5       // Readings to average per cycle
#define SENSOR_READ_DELAY_MS       25      // Delay between raw readings (ms)
#define MAX_VALID_DISTANCE_CM      300     // Reject readings beyond this (cm)
#define MIN_VALID_DISTANCE_CM      2       // Reject readings below this (cm)

// --- Loop Timing ---
#define MAIN_LOOP_INTERVAL_MS      600     // Main sensor poll interval (ms)
#define MQTT_PUBLISH_INTERVAL_MS   5000    // How often to publish food level (ms)

// --- NTP Time ---
#define NTP_SERVER                 "pool.ntp.org"
#define UTC_OFFSET_SECONDS         7200    // UTC+2 for Egypt (Cairo). Change for your timezone.
#define DAYLIGHT_OFFSET_SECONDS    0       // Daylight saving time offset


// ═══════════════════════════════════════════════════════════════════
//  FEEDING SCHEDULE  ← Edit times here
// ═══════════════════════════════════════════════════════════════════
// Each FeedingSlot defines a window (startHour:startMin → endHour:endMin)
// during which pet detection will trigger the servo.

struct FeedingSlot {
  int startHour;
  int startMinute;
  int endHour;
  int endMinute;
  const char* label;
};

// Add or remove feeding slots as needed
const FeedingSlot FEEDING_SCHEDULE[] = {
  { 8,  0,  8, 10, "Morning Feeding"  },   // 08:00 → 08:10
  { 18, 0, 18, 10, "Evening Feeding"  },   // 18:00 → 18:10
};

const int FEEDING_SLOT_COUNT = sizeof(FEEDING_SCHEDULE) / sizeof(FeedingSlot);


// ═══════════════════════════════════════════════════════════════════
//  GLOBAL OBJECTS
// ═══════════════════════════════════════════════════════════════════
WiFiClient   wifiClient;
PubSubClient mqttClient(wifiClient);
Servo        feederServo;


// ═══════════════════════════════════════════════════════════════════
//  GLOBAL STATE VARIABLES
// ═══════════════════════════════════════════════════════════════════
bool          servoIsOpen           = false;
unsigned long servoOpenTimestamp    = 0;
bool          manualDispensePending = false;  // Flag set by MQTT callback
bool          lastPetDetectedState  = false;
bool          lastLowFoodState      = false;
int           petConfirmCounter     = 0;

unsigned long lastMqttPublishTime   = 0;
unsigned long lastLoopTime          = 0;


// ═══════════════════════════════════════════════════════════════════
//  ──────────────────────────────────────────────────────────────
//  SECTION 1: UTILITY / SENSOR FUNCTIONS
//  ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

/*
 * readRawDistanceCM()
 * -------------------
 * Fires a single ultrasonic pulse and returns measured distance in cm.
 * Returns -1.0 on timeout or if distance is out of sensor range.
 */
float readRawDistanceCM(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(4);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);  // 30ms timeout

  if (duration == 0) return -1.0;

  float distance = (duration / 2.0) * 0.0343;

  if (distance < MIN_VALID_DISTANCE_CM || distance > MAX_VALID_DISTANCE_CM) {
    return -1.0;
  }

  return distance;
}

/*
 * getStableDistanceCM()
 * ----------------------
 * Takes multiple readings and returns the average of valid ones.
 * This eliminates false 0.00 cm spikes caused by sensor noise.
 * Returns -1.0 if ALL readings failed.
 */
float getStableDistanceCM(int trigPin, int echoPin) {
  float total      = 0.0;
  int   validCount = 0;

  for (int i = 0; i < SENSOR_READ_ATTEMPTS; i++) {
    float reading = readRawDistanceCM(trigPin, echoPin);
    if (reading > 0.0) {
      total += reading;
      validCount++;
    }
    delay(SENSOR_READ_DELAY_MS);
  }

  return (validCount == 0) ? -1.0 : (total / validCount);
}

/*
 * calculateFoodPercent()
 * -----------------------
 * Converts food sensor distance (cm) to food level percentage.
 * Full container  → sensor reads small distance → high %
 * Empty container → sensor reads CONTAINER_HEIGHT_CM → 0%
 */
float calculateFoodPercent(float distanceCM) {
  if (distanceCM < 0) return -1.0;
  float clamped = constrain(distanceCM, 0.0, (float)CONTAINER_HEIGHT_CM);
  return ((CONTAINER_HEIGHT_CM - clamped) / (float)CONTAINER_HEIGHT_CM) * 100.0;
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 2: TIME / SCHEDULE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/*
 * getCurrentTime()
 * ----------------
 * Fetches current local time from the NTP-synced system clock.
 * Returns a tm struct with hour, minute, second, etc.
 */
struct tm getCurrentTime() {
  struct tm timeInfo;
  if (!getLocalTime(&timeInfo)) {
    // If NTP not yet synced, return zeroed struct
    memset(&timeInfo, 0, sizeof(timeInfo));
  }
  return timeInfo;
}

/*
 * isWithinFeedingSchedule()
 * --------------------------
 * Checks if the current time falls inside any configured feeding slot.
 * Returns the matching slot index (0-based), or -1 if not feeding time.
 */
int isWithinFeedingSchedule() {
  struct tm now = getCurrentTime();

  for (int i = 0; i < FEEDING_SLOT_COUNT; i++) {
    int nowTotal   = now.tm_hour * 60 + now.tm_min;
    int startTotal = FEEDING_SCHEDULE[i].startHour   * 60 + FEEDING_SCHEDULE[i].startMinute;
    int endTotal   = FEEDING_SCHEDULE[i].endHour     * 60 + FEEDING_SCHEDULE[i].endMinute;

    if (nowTotal >= startTotal && nowTotal <= endTotal) {
      return i;  // Currently within this feeding window
    }
  }
  return -1;  // Not feeding time
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 3: SERVO CONTROL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/*
 * openServo()
 * -----------
 * Opens the food door to 180° and records the open timestamp.
 * Publishes OPEN status to MQTT.
 * Guard: does nothing if servo is already open.
 */
void openServo(const char* reason) {
  if (servoIsOpen) return;

  feederServo.write(SERVO_OPEN_ANGLE);
  servoIsOpen        = true;
  servoOpenTimestamp = millis();

  Serial.println("══════════════════════════════════════");
  Serial.print  (">>> SERVO OPEN  [Reason: ");
  Serial.print  (reason);
  Serial.println("]");
  Serial.println("══════════════════════════════════════");

  mqttClient.publish(TOPIC_SERVO_STATUS, "OPEN", true);
}

/*
 * closeServo()
 * ------------
 * Closes the food door back to 0°.
 * Publishes CLOSED status to MQTT.
 * Guard: does nothing if servo is already closed.
 */
void closeServo() {
  if (!servoIsOpen) return;

  feederServo.write(SERVO_CLOSED_ANGLE);
  servoIsOpen = false;

  Serial.println("══════════════════════════════════════");
  Serial.println(">>> SERVO CLOSED");
  Serial.println("══════════════════════════════════════");

  mqttClient.publish(TOPIC_SERVO_STATUS, "CLOSED", true);
}

/*
 * checkServoTimeout()
 * -------------------
 * Called every loop cycle.
 * Auto-closes the servo after SERVO_OPEN_DURATION_MS has elapsed.
 */
void checkServoTimeout() {
  if (servoIsOpen && (millis() - servoOpenTimestamp >= SERVO_OPEN_DURATION_MS)) {
    closeServo();
  }
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 4: ALARM / INDICATOR FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/*
 * activateLowFoodAlarm()
 * ----------------------
 * Turns ON the LED and buzzer.
 * Publishes lowFoodAlert = true to MQTT (only on state change).
 */
void activateLowFoodAlarm(float foodPercent) {
  digitalWrite(LED_PIN,    HIGH);
  digitalWrite(BUZZER_PIN, HIGH);

  if (!lastLowFoodState) {
    // State changed from normal → low food: publish alert
    mqttClient.publish(TOPIC_LOW_FOOD_ALERT, "true", true);

    Serial.println("══════════════════════════════════════");
    Serial.print  (">>> LOW FOOD ALERT! Food at ");
    Serial.print  (foodPercent, 1);
    Serial.println("%");
    Serial.println("    LED ON | BUZZER ON | MQTT PUBLISHED");
    Serial.println("══════════════════════════════════════");

    lastLowFoodState = true;
  }
}

/*
 * clearLowFoodAlarm()
 * -------------------
 * Turns OFF the LED and buzzer.
 * Publishes lowFoodAlert = false to MQTT (only on state change).
 */
void clearLowFoodAlarm() {
  digitalWrite(LED_PIN,    LOW);
  digitalWrite(BUZZER_PIN, LOW);

  if (lastLowFoodState) {
    // State changed from low food → normal: clear alert
    mqttClient.publish(TOPIC_LOW_FOOD_ALERT, "false", true);

    Serial.println("[FOOD]  Food level NORMAL. LED OFF | Buzzer OFF | Alert cleared.");
    lastLowFoodState = false;
  }
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 5: MQTT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/*
 * mqttCallback()
 * --------------
 * Called automatically by PubSubClient whenever a subscribed
 * topic receives a new message.
 * Currently handles: petfeeder/manualDispense
 */
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert raw payload bytes to a null-terminated string
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.print("[MQTT] Incoming | Topic: ");
  Serial.print(topic);
  Serial.print(" | Message: ");
  Serial.println(message);

  // ── Handle Manual Dispense Command ───────────────────────
  if (strcmp(topic, TOPIC_MANUAL_DISPENSE) == 0) {
    if (strcmp(message, "DISPENSE") == 0) {
      Serial.println("[MQTT] MANUAL DISPENSE command received from frontend.");
      manualDispensePending = true;   // Flag handled safely in main loop
    }
  }
}

/*
 * connectMQTT()
 * -------------
 * Attempts to connect to the HiveMQ broker.
 * Subscribes to required topics on success.
 * Retries up to 5 times before giving up this cycle.
 */
void connectMQTT() {
  int attempts = 0;

  while (!mqttClient.connected() && attempts < 5) {
    Serial.print("[MQTT] Connecting to broker... (attempt ");
    Serial.print(attempts + 1);
    Serial.println(")");

    bool connected = mqttClient.connect(
      MQTT_CLIENT_ID,
      MQTT_USERNAME,
      MQTT_PASSWORD
    );

    if (connected) {
      Serial.println("[MQTT] ✓ MQTT CONNECTED");

      // ── Subscribe to topics ───────────────────────────────
      mqttClient.subscribe(TOPIC_MANUAL_DISPENSE);
      Serial.print("[MQTT] Subscribed to: ");
      Serial.println(TOPIC_MANUAL_DISPENSE);

    } else {
      Serial.print("[MQTT] ✗ Connection failed. State code: ");
      Serial.println(mqttClient.state());
      delay(3000);
    }

    attempts++;
  }
}

/*
 * ensureMQTTConnected()
 * ----------------------
 * Called every loop cycle.
 * If connection dropped, attempts to reconnect automatically.
 */
void ensureMQTTConnected() {
  if (!mqttClient.connected()) {
    Serial.println("[MQTT] ⚠ Connection lost. Attempting reconnect...");
    connectMQTT();
  }
  mqttClient.loop();  // Must be called regularly to process incoming messages
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 6: WIFI FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/*
 * connectWiFi()
 * -------------
 * Blocks until WiFi connection is established.
 * Prints dots while waiting.
 */
void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("[WiFi] ✓ WIFI CONNECTED");
  Serial.print  ("[WiFi] IP Address: ");
  Serial.println(WiFi.localIP());
}

/*
 * syncNTPTime()
 * -------------
 * Configures NTP client and waits for time to be synchronized.
 * Required for feeding schedule to function correctly.
 */
void syncNTPTime() {
  configTime(UTC_OFFSET_SECONDS, DAYLIGHT_OFFSET_SECONDS, NTP_SERVER);

  Serial.print("[NTP] Syncing time");
  struct tm timeInfo;
  int retries = 0;

  while (!getLocalTime(&timeInfo) && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (getLocalTime(&timeInfo)) {
    Serial.println();
    Serial.print("[NTP] ✓ Time synced: ");
    Serial.printf("%02d:%02d:%02d\n", timeInfo.tm_hour, timeInfo.tm_min, timeInfo.tm_sec);
  } else {
    Serial.println();
    Serial.println("[NTP] ✗ Time sync failed. Schedule will not work correctly.");
  }
}


// ═══════════════════════════════════════════════════════════════════
//  SECTION 7: MAIN LOGIC FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/*
 * handlePetDetection()
 * ---------------------
 * Reads the pet sensor, determines if a pet is present,
 * checks the feeding schedule, and opens the servo if allowed.
 * Also publishes petDetected status to MQTT.
 */
void handlePetDetection() {
  float petDistance = getStableDistanceCM(PET_TRIG_PIN, PET_ECHO_PIN);

  // Log distance regardless
  if (petDistance > 0) {
    Serial.print("[PET SENSOR]  Distance: ");
    Serial.print(petDistance, 2);
    Serial.println(" cm");
  } else {
    Serial.println("[PET SENSOR]  Distance: ERROR (no valid reading)");
    return;
  }

  bool petNow = (petDistance <= PET_DETECT_THRESHOLD_CM);

  // ── Confirm detection with consecutive reads ──────────────
  // Prevents single-spike false positives
  if (petNow) {
    petConfirmCounter++;
  } else {
    petConfirmCounter = 0;
  }

  bool petConfirmed = (petConfirmCounter >= PET_CONFIRM_READS);

  // ── Publish pet detected state (only on change) ───────────
  if (petConfirmed != lastPetDetectedState) {
    mqttClient.publish(TOPIC_PET_DETECTED, petConfirmed ? "true" : "false", true);
    lastPetDetectedState = petConfirmed;

    if (petConfirmed) {
      Serial.println("[PET SENSOR]  >>> PET DETECTED — Status published: true");
    } else {
      Serial.println("[PET SENSOR]  Pet left. Status published: false");
    }
  }

  // ── Check schedule and open servo ────────────────────────
  if (petConfirmed && !servoIsOpen) {
    int slotIndex = isWithinFeedingSchedule();

    if (slotIndex >= 0) {
      Serial.print("[SCHEDULE]   FEEDING ALLOWED — ");
      Serial.println(FEEDING_SCHEDULE[slotIndex].label);
      openServo("Pet Detected + Scheduled Feeding");

    } else {
      Serial.println("[SCHEDULE]   FEEDING NOT ALLOWED — Outside scheduled feeding time.");

      // Print current time to help with debugging
      struct tm now = getCurrentTime();
      Serial.printf("[SCHEDULE]   Current time: %02d:%02d\n", now.tm_hour, now.tm_min);
    }
  }
}

/*
 * handleFoodLevel()
 * -----------------
 * Reads the food level sensor, calculates percentage,
 * and triggers/clears the low food alarm accordingly.
 * Publishes food percentage to MQTT at set intervals.
 */
void handleFoodLevel() {
  float foodDistance = getStableDistanceCM(FOOD_TRIG_PIN, FOOD_ECHO_PIN);
  float foodPercent  = calculateFoodPercent(foodDistance);

  if (foodDistance < 0 || foodPercent < 0) {
    Serial.println("[FOOD SENSOR] Distance: ERROR (no valid reading)");
    return;
  }

  Serial.print("[FOOD SENSOR] Distance: ");
  Serial.print(foodDistance, 2);
  Serial.print(" cm  |  Level: ");
  Serial.print(foodPercent, 1);
  Serial.println("%");

  // ── Low Food Alert ────────────────────────────────────────
  if (foodPercent < LOW_FOOD_THRESHOLD_PERCENT) {
    activateLowFoodAlarm(foodPercent);
  } else {
    clearLowFoodAlarm();
    Serial.println("[FOOD]  Food level NORMAL.");
  }

  // ── Publish food level percentage periodically ────────────
  unsigned long now = millis();
  if (now - lastMqttPublishTime >= MQTT_PUBLISH_INTERVAL_MS) {
    char foodStr[8];
    dtostrf(foodPercent, 4, 1, foodStr);  // Convert float to "XX.X"
    mqttClient.publish(TOPIC_FOOD_LEVEL, foodStr, true);
    Serial.print("[MQTT] Published food level: ");
    Serial.println(foodStr);

    lastMqttPublishTime = now;
  }
}

/*
 * handleManualDispense()
 * -----------------------
 * Checks if a manual dispense command was received via MQTT.
 * Opens the servo REGARDLESS of feeding schedule.
 * Clears the pending flag after action.
 */
void handleManualDispense() {
  if (manualDispensePending) {
    Serial.println("══════════════════════════════════════");
    Serial.println(">>> MANUAL DISPENSE ACTIVATED (via Frontend)");
    Serial.println("    Bypassing feeding schedule.");
    Serial.println("══════════════════════════════════════");

    if (servoIsOpen) {
      // Already open — reset the timer
      servoOpenTimestamp = millis();
      Serial.println("[SERVO] Already open. Timer reset.");
    } else {
      openServo("Manual Dispense — Frontend Button");
    }

    manualDispensePending = false;
  }
}


// ═══════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("╔══════════════════════════════════════════╗");
  Serial.println("║   SMART PET FEEDER — FINAL VERSION 2.0  ║");
  Serial.println("╚══════════════════════════════════════════╝");
  Serial.println("[INIT] System starting up...");

  // ── GPIO Configuration ────────────────────────────────────
  // Pet Detection Sensor
  pinMode(PET_TRIG_PIN,  OUTPUT);
  pinMode(PET_ECHO_PIN,  INPUT);
  digitalWrite(PET_TRIG_PIN, LOW);

  // Food Level Sensor
  pinMode(FOOD_TRIG_PIN, OUTPUT);
  pinMode(FOOD_ECHO_PIN, INPUT);
  digitalWrite(FOOD_TRIG_PIN, LOW);

  // LED & Buzzer — start OFF
  pinMode(LED_PIN,    OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN,    LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // ── Servo Configuration ───────────────────────────────────
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  feederServo.setPeriodHertz(50);              // SG90 standard: 50Hz PWM
  feederServo.attach(SERVO_PIN, 500, 2400);    // SG90 pulse range
  feederServo.write(SERVO_CLOSED_ANGLE);       // Start closed
  delay(300);

  Serial.println("[INIT] GPIO & Servo configured.");

  // ── WiFi ──────────────────────────────────────────────────
  connectWiFi();

  // ── NTP Time Sync ─────────────────────────────────────────
  syncNTPTime();

  // ── MQTT ──────────────────────────────────────────────────
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);       // Send PINGREQ every 60s to keep connection alive
  mqttClient.setBufferSize(512);     // Increase buffer for larger payloads if needed
  connectMQTT();

  // ── Startup Indicator Beep ────────────────────────────────
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);
  delay(100);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println();
  Serial.println("[INIT] ✓ SYSTEM READY");
  Serial.println("──────────────────────────────────────────");
  Serial.println("[INIT] Feeding Schedule:");
  for (int i = 0; i < FEEDING_SLOT_COUNT; i++) {
    Serial.printf("       [%d] %s — %02d:%02d to %02d:%02d\n",
      i + 1,
      FEEDING_SCHEDULE[i].label,
      FEEDING_SCHEDULE[i].startHour,
      FEEDING_SCHEDULE[i].startMinute,
      FEEDING_SCHEDULE[i].endHour,
      FEEDING_SCHEDULE[i].endMinute
    );
  }
  Serial.println("──────────────────────────────────────────");
  Serial.println();
}


// ═══════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════════
void loop() {

  // ── 1. Keep MQTT alive & process incoming messages ────────
  ensureMQTTConnected();

  // ── 2. Rate-limit main sensor logic ──────────────────────
  unsigned long now = millis();
  if (now - lastLoopTime < MAIN_LOOP_INTERVAL_MS) {
    return;
  }
  lastLoopTime = now;

  // ── 3. Print loop divider ─────────────────────────────────
  Serial.println("──────────────────────────────────────────");

  struct tm currentTime = getCurrentTime();
  Serial.printf("[TIME]  %02d:%02d:%02d\n",
    currentTime.tm_hour,
    currentTime.tm_min,
    currentTime.tm_sec
  );

  // ── 4. Handle Manual Dispense (highest priority) ──────────
  handleManualDispense();

  // ── 5. Auto-close servo after timeout ────────────────────
  checkServoTimeout();

  // ── 6. Pet Detection + Scheduled Feeding ─────────────────
  handlePetDetection();

  // ── 7. Food Level Monitoring ──────────────────────────────
  handleFoodLevel();

  Serial.println();
}
