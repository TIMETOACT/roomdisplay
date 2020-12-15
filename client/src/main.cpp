/*
 * This file is part of Digital doorplate client software, licensed under the MIT License.
 *
 *  Copyright (c) 2020 TIMETOACT Software & Consulting GmbH <info@timetoact.de>
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in all
 *  copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *  SOFTWARE.
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <ArduinoOTA.h>
#include <string> 
#include "epd.h"
#include "esp.h"

#define NAME "DTS-P1"
const char* ssid = "WIFI_SSID";
const char* password = "WIFI_PASSWORD";
const char* otaPassword = "OTA_PASSWORD";

const int analogInPin = A0;  // ESP8266 Analog Pin ADC0 = A0

int sensorValue = 0;  // value read from the pot
int outputValue = 0;  // value to output to a PWM pin

ESP8266WebServer server(80);
IPAddress myIP;
void setup(void);
void loop(void);
void initArduinoOTA();
void EPD_Init();
void EPD_Load();
void EPD_Show();
void ESP_Sleep();
void ESP_Battery();
void handleNotFound();


void setup(void) {

  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.print("Connected to ");
  Serial.println(ssid);

  pinMode(CS_PIN , OUTPUT);
  pinMode(RST_PIN , OUTPUT);
  pinMode(DC_PIN , OUTPUT);
  pinMode(BUSY_PIN, INPUT);
  SPI.begin();

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.print("\r\nIP address: ");
  Serial.println(myIP = WiFi.localIP());
  Serial.print("\r\nMAC address: ");
  Serial.println(WiFi.macAddress());

  if (MDNS.begin(NAME)) {
    Serial.println("MDNS responder started");
  }

  server.on("/LOAD", EPD_Load);
  server.on("/EPD", EPD_Init);
  server.on("/SHOW", EPD_Show);
  server.on("/SLEEP", ESP_Sleep);
  server.on("/BATTERY", ESP_Battery);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("HTTP server started");

  initArduinoOTA();
}

void initArduinoOTA() {
  ArduinoOTA.setPort(8266);
  ArduinoOTA.setHostname(NAME);
  if (strcmp(otaPassword, "") != 0) {
    ArduinoOTA.setPassword(otaPassword);
  }
    ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH) {
      type = "sketch";
    } else { // U_FS
      type = "filesystem";
    }
  });
  ArduinoOTA.begin();
}

void loop(void) {
  ArduinoOTA.handle();
  server.handleClient();
}

void EPD_Init()
{
  sensorValue = analogRead(analogInPin);
  outputValue = map(sensorValue, 515, 670, 0, 100);

  char buffer [33];
  char *battery = itoa(outputValue, buffer, 10);

  EPD_dispInit();
  server.sendHeader("Access-Control-Allow-Methods", "POST,GET");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Battery", battery);
  server.send(200, "text/plain", "Init ok\r\n");
}

void EPD_Load()
{
  String p = server.arg(0);
  if (p.endsWith("LOAD")) {
    int index = p.length() - 8;
    int L = ((int)p[index] - 'a') + (((int)p[index + 1] - 'a') << 4) + (((int)p[index + 2] - 'a') << 8) + (((int)p[index + 3] - 'a') << 12);
    if (L == (p.length() - 8)) {
      if (EPD_dispLoad != 0) EPD_dispLoad();
    }
  }
  server.sendHeader("Access-Control-Allow-Methods", "POST,GET");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "Load ok\r\n");
}

void EPD_Show()
{
  String p = server.arg(0);
  EPD_dispMass.show();
  server.sendHeader("Access-Control-Allow-Methods", "POST,GET");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "Show ok\r\n");
  Board_Sleep(p);
}

void ESP_Sleep()
{
  String p = server.arg(0);
  server.sendHeader("Access-Control-Allow-Methods", "POST,GET");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "Sleep ok\r\n");
  Board_Sleep(p);
}

void ESP_Battery()
{

  sensorValue = analogRead(analogInPin);
  outputValue = map(sensorValue, 515, 670, 0, 100);

  char buffer [33];
  char *battery = itoa(outputValue, buffer, 10);
  server.sendHeader("Access-Control-Allow-Methods", "GET");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", battery);
}

void handleNotFound() {
  String message = "File Not Found\n\n";
  message += "URI: ";
  message += server.uri();
  message += "\nMethod: ";
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";
  for (uint8_t i = 0; i < server.args(); i++) {
    message += " " + server.argName(i) + ": " + server.arg(i) + "\n";
  }
  server.sendHeader("Access-Control-Allow-Methods", "POST,GET");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", message);
  Serial.print("Unknown URI: ");
  Serial.println(server.uri());
}