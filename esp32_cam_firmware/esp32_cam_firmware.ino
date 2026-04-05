/*
 * ESP32-CAM Firmware for AI Defect Detection System
 * 
 * This sketch configures the ESP32-CAM module to:
 *   1. Connect to your WiFi network
 *   2. Serve a live MJPEG video stream at http://<ESP32_IP>:81/stream
 *   3. Serve a single JPEG snapshot at http://<ESP32_IP>/capture
 *   4. Toggle the onboard LED flash at http://<ESP32_IP>/flash
 * 
 * HARDWARE:
 *   - ESP32-CAM (AI-Thinker module with OV2640 camera)
 *   - USB-to-Serial adapter (FTDI/CP2102) for programming
 * 
 * WIRING FOR UPLOAD:
 *   ESP32-CAM    →  USB-to-Serial
 *   5V           →  5V (or 3.3V to 3.3V)
 *   GND          →  GND
 *   U0R (GPIO3)  →  TX
 *   U0T (GPIO1)  →  RX
 *   IO0 (GPIO0)  →  GND  (ONLY during upload, disconnect after)
 * 
 * UPLOAD STEPS:
 *   1. Install ESP32 board support in Arduino IDE:
 *      File → Preferences → Additional Board Manager URLs:
 *      https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
 *   2. Tools → Board → ESP32 Arduino → AI Thinker ESP32-CAM
 *   3. Tools → Port → select your COM port
 *   4. Connect IO0 to GND, press RST button on ESP32-CAM
 *   5. Click Upload
 *   6. After upload completes, disconnect IO0 from GND, press RST again
 *   7. Open Serial Monitor at 115200 baud to see the IP address
 * 
 * ARDUINO IDE SETTINGS:
 *   Board:           AI Thinker ESP32-CAM
 *   CPU Frequency:   240MHz
 *   Flash Frequency: 80MHz
 *   Flash Mode:      QIO
 *   Partition Scheme: Huge APP (3MB No OTA)
 *   Upload Speed:    115200
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ============================================================
// ⚠️  CHANGE THESE TO YOUR WIFI CREDENTIALS
// ============================================================
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ============================================================
// Camera pin definitions for AI-Thinker ESP32-CAM
// ============================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Onboard LED flash (GPIO 4 on AI-Thinker)
#define FLASH_GPIO_NUM     4

// HTTP server handles
httpd_handle_t camera_httpd = NULL;
httpd_handle_t stream_httpd = NULL;

bool flashState = false;

// ============================================================
// JPEG Snapshot Handler — GET /capture
// Returns a single JPEG frame with CORS headers
// ============================================================
static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET");
  httpd_resp_set_hdr(req, "Cache-Control", "no-cache, no-store, must-revalidate");

  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

// ============================================================
// MJPEG Stream Handler — GET /stream (port 81)
// Sends continuous multipart JPEG frames
// ============================================================
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\nX-Timestamp: %ld\r\n\r\n";

static esp_err_t stream_handler(httpd_req_t *req) {
  esp_err_t res = ESP_OK;
  char part_buf[128];

  // Set CORS headers for stream
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "X-Framerate", "25");

  res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  while (true) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      res = ESP_FAIL;
      break;
    }

    size_t hlen = snprintf(part_buf, sizeof(part_buf), STREAM_PART, fb->len, (long)esp_timer_get_time());

    res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    }

    esp_camera_fb_return(fb);

    if (res != ESP_OK) break;

    // Small delay to control frame rate (~20-25 fps)
    delay(40);
  }
  return res;
}

// ============================================================
// Flash LED Toggle Handler — GET /flash
// ============================================================
static esp_err_t flash_handler(httpd_req_t *req) {
  flashState = !flashState;
  digitalWrite(FLASH_GPIO_NUM, flashState ? HIGH : LOW);

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_type(req, "text/plain");

  char resp[32];
  snprintf(resp, sizeof(resp), "Flash: %s", flashState ? "ON" : "OFF");
  httpd_resp_send(req, resp, strlen(resp));
  return ESP_OK;
}

// ============================================================
// CORS Preflight Handler — OPTIONS *
// ============================================================
static esp_err_t cors_handler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, OPTIONS");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "*");
  httpd_resp_send(req, NULL, 0);
  return ESP_OK;
}

// ============================================================
// Status Handler — GET /status
// Returns JSON with camera info
// ============================================================
static esp_err_t status_handler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_type(req, "application/json");

  sensor_t *s = esp_camera_sensor_get();
  char buf[256];
  snprintf(buf, sizeof(buf),
    "{\"connected\":true,\"framesize\":%d,\"quality\":%d,\"brightness\":%d,\"flash\":%s}",
    s->status.framesize, s->status.quality, s->status.brightness,
    flashState ? "true" : "false"
  );
  httpd_resp_send(req, buf, strlen(buf));
  return ESP_OK;
}

// ============================================================
// Start HTTP Servers
// ============================================================
void startCameraServer() {
  // Main server on port 80 — snapshot, flash, status
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.max_uri_handlers = 8;

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    // Capture endpoint
    httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler };
    httpd_register_uri_handler(camera_httpd, &capture_uri);

    // Flash endpoint
    httpd_uri_t flash_uri = { .uri = "/flash", .method = HTTP_GET, .handler = flash_handler };
    httpd_register_uri_handler(camera_httpd, &flash_uri);

    // Status endpoint
    httpd_uri_t status_uri = { .uri = "/status", .method = HTTP_GET, .handler = status_handler };
    httpd_register_uri_handler(camera_httpd, &status_uri);

    // CORS preflight for capture
    httpd_uri_t cors_capture = { .uri = "/capture", .method = HTTP_OPTIONS, .handler = cors_handler };
    httpd_register_uri_handler(camera_httpd, &cors_capture);

    // CORS preflight for status
    httpd_uri_t cors_status = { .uri = "/status", .method = HTTP_OPTIONS, .handler = cors_handler };
    httpd_register_uri_handler(camera_httpd, &cors_status);

    Serial.println("HTTP server started on port 80");
  }

  // Stream server on port 81
  config.server_port = 81;
  config.ctrl_port = 32769;

  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler };
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    Serial.println("Stream server started on port 81");
  }
}

// ============================================================
// Setup
// ============================================================
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== AI Defect Detection - ESP32-CAM ===");

  // Setup flash LED
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);

  // Camera configuration
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode    = CAMERA_GRAB_LATEST;

  // Use higher resolution if PSRAM is available
  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;    // 640x480
    config.jpeg_quality = 10;               // 0-63, lower = better quality
    config.fb_count     = 2;
    config.fb_location  = CAMERA_FB_IN_PSRAM;
    Serial.println("PSRAM found - using VGA resolution");
  } else {
    config.frame_size   = FRAMESIZE_QVGA;   // 320x240
    config.jpeg_quality = 12;
    config.fb_count     = 1;
    config.fb_location  = CAMERA_FB_IN_DRAM;
    Serial.println("No PSRAM - using QVGA resolution");
  }

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init FAILED with error 0x%x\n", err);
    Serial.println("Check wiring and power supply!");
    return;
  }
  Serial.println("Camera initialized successfully");

  // Adjust camera sensor settings for defect detection
  sensor_t *s = esp_camera_sensor_get();
  s->set_brightness(s, 1);      // Slightly brighter
  s->set_contrast(s, 1);        // Higher contrast for defect visibility
  s->set_saturation(s, 0);      // Neutral saturation
  s->set_whitebal(s, 1);        // Auto white balance ON
  s->set_awb_gain(s, 1);        // AWB gain ON
  s->set_wb_mode(s, 0);         // Auto WB mode
  s->set_exposure_ctrl(s, 1);   // Auto exposure ON
  s->set_aec2(s, 1);            // AEC DSP ON
  s->set_gain_ctrl(s, 1);       // Auto gain ON
  s->set_agc_gain(s, 0);        // AGC gain 0
  s->set_gainceiling(s, (gainceiling_t)6); // Gain ceiling
  s->set_bpc(s, 1);             // Bad pixel correction ON
  s->set_wpc(s, 1);             // White pixel correction ON
  s->set_raw_gma(s, 1);         // Gamma correction ON
  s->set_lenc(s, 1);            // Lens correction ON
  s->set_dcw(s, 1);             // Downsize EN
  s->set_hmirror(s, 0);         // No horizontal mirror
  s->set_vflip(s, 0);           // No vertical flip

  // Connect to WiFi
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);           // Disable WiFi sleep for smooth streaming
  Serial.print("Connecting to WiFi");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi connection FAILED!");
    Serial.println("Check SSID and password, then reset.");
    return;
  }

  Serial.println();
  Serial.println("========================================");
  Serial.println("  WiFi Connected Successfully!");
  Serial.println("========================================");
  Serial.print("  Camera Ready! Use this IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();
  Serial.println("  Endpoints:");
  Serial.print("    Snapshot:  http://");
  Serial.print(WiFi.localIP());
  Serial.println("/capture");
  Serial.print("    Stream:    http://");
  Serial.print(WiFi.localIP());
  Serial.println(":81/stream");
  Serial.print("    Flash:     http://");
  Serial.print(WiFi.localIP());
  Serial.println("/flash");
  Serial.print("    Status:    http://");
  Serial.print(WiFi.localIP());
  Serial.println("/status");
  Serial.println("========================================");
  Serial.println();
  Serial.println("Enter this IP in the web app's ESP32-CAM tab.");

  // Start the camera web server
  startCameraServer();
}

// ============================================================
// Loop
// ============================================================
void loop() {
  // Nothing needed here — HTTP servers run asynchronously
  delay(10000);

  // Periodic heartbeat log
  Serial.printf("Uptime: %lu sec | WiFi: %s | IP: %s\n",
    millis() / 1000,
    WiFi.status() == WL_CONNECTED ? "OK" : "DISCONNECTED",
    WiFi.localIP().toString().c_str()
  );

  // Auto-reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost! Reconnecting...");
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nReconnected!");
    }
  }
}
