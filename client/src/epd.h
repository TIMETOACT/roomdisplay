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

#include <SPI.h>

extern ESP8266WebServer server;

#define CS_PIN 15
#define RST_PIN 2
#define DC_PIN 4
#define BUSY_PIN 5

#define LOW 0
#define HIGH 1

#define GPIO_PIN_SET 1
#define GPIO_PIN_RESET 0

byte lut_full_mono[] = {
    0x02, 0x02, 0x01, 0x11, 0x12, 0x12, 0x22, 0x22,
    0x66, 0x69, 0x69, 0x59, 0x58, 0x99, 0x99, 0x88,
    0x00, 0x00, 0x00, 0x00, 0xF8, 0xB4, 0x13, 0x51,
    0x35, 0x51, 0x51, 0x19, 0x01, 0x00};

byte lut_partial_mono[] = {
    0x10, 0x18, 0x18, 0x08, 0x18, 0x18, 0x08, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x13, 0x14, 0x44, 0x12,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00};

/* The procedure of sending a byte to e-Paper by SPI -------------------------*/
void EpdSpiTransferCallback(byte data)
{
    digitalWrite(CS_PIN, GPIO_PIN_RESET);
    SPI.transfer(data);
    digitalWrite(CS_PIN, GPIO_PIN_SET);
}

byte lut_vcom0[] = {15, 0x0E, 0x14, 0x01, 0x0A, 0x06, 0x04, 0x0A, 0x0A, 0x0F, 0x03, 0x03, 0x0C, 0x06, 0x0A, 0x00};
byte lut_w[] = {15, 0x0E, 0x14, 0x01, 0x0A, 0x46, 0x04, 0x8A, 0x4A, 0x0F, 0x83, 0x43, 0x0C, 0x86, 0x0A, 0x04};
byte lut_b[] = {15, 0x0E, 0x14, 0x01, 0x8A, 0x06, 0x04, 0x8A, 0x4A, 0x0F, 0x83, 0x43, 0x0C, 0x06, 0x4A, 0x04};
byte lut_g1[] = {15, 0x8E, 0x94, 0x01, 0x8A, 0x06, 0x04, 0x8A, 0x4A, 0x0F, 0x83, 0x43, 0x0C, 0x06, 0x0A, 0x04};
byte lut_g2[] = {15, 0x8E, 0x94, 0x01, 0x8A, 0x06, 0x04, 0x8A, 0x4A, 0x0F, 0x83, 0x43, 0x0C, 0x06, 0x0A, 0x04};
byte lut_vcom1[] = {15, 0x03, 0x1D, 0x01, 0x01, 0x08, 0x23, 0x37, 0x37, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
byte lut_red0[] = {15, 0x83, 0x5D, 0x01, 0x81, 0x48, 0x23, 0x77, 0x77, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
byte lut_red1[] = {15, 0x03, 0x1D, 0x01, 0x01, 0x08, 0x23, 0x37, 0x37, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};

void EPD_SendCommand(byte command)
{
    digitalWrite(DC_PIN, LOW);
    EpdSpiTransferCallback(command);
}

void EPD_SendData(byte data)
{
    digitalWrite(DC_PIN, HIGH);
    EpdSpiTransferCallback(data);
}

void EPD_WaitUntilIdle()
{
    //0: busy, 1: idle
    while (digitalRead(BUSY_PIN) == 0)
        delay(100);
}

void EPD_Send_1(byte c, byte v1)
{
    EPD_SendCommand(c);
    EPD_SendData(v1);
}

void EPD_Send_2(byte c, byte v1, byte v2)
{
    EPD_SendCommand(c);
    EPD_SendData(v1);
    EPD_SendData(v2);
}

void EPD_Send_3(byte c, byte v1, byte v2, byte v3)
{
    EPD_SendCommand(c);
    EPD_SendData(v1);
    EPD_SendData(v2);
    EPD_SendData(v3);
}

void EPD_Send_4(byte c, byte v1, byte v2, byte v3, byte v4)
{
    EPD_SendCommand(c);
    EPD_SendData(v1);
    EPD_SendData(v2);
    EPD_SendData(v3);
    EPD_SendData(v4);
}

void EPD_Send_5(byte c, byte v1, byte v2, byte v3, byte v4, byte v5)
{
    EPD_SendCommand(c);
    EPD_SendData(v1);
    EPD_SendData(v2);
    EPD_SendData(v3);
    EPD_SendData(v4);
    EPD_SendData(v5);
}

void EPD_lut(byte c, byte l, byte *p)
{
    // lut-data writting initialization
    EPD_SendCommand(c);

    // lut-data writting doing
    for (int i = 0; i < l; i++, p++)
        EPD_SendData(*p);
}

void EPD_SetLutBw(byte *c20, byte *c21, byte *c22, byte *c23, byte *c24)
{
    EPD_lut(0x20, *c20, c20 + 1); //g vcom
    EPD_lut(0x21, *c21, c21 + 1); //g ww --
    EPD_lut(0x22, *c22, c22 + 1); //g bw r
    EPD_lut(0x23, *c23, c23 + 1); //g wb w
    EPD_lut(0x24, *c24, c24 + 1); //g bb b
}

void EPD_SetLutRed(byte *c25, byte *c26, byte *c27)
{
    EPD_lut(0x25, *c25, c25 + 1);
    EPD_lut(0x26, *c26, c26 + 1);
    EPD_lut(0x27, *c27, c27 + 1);
}

void EPD_Reset()
{
    digitalWrite(RST_PIN, LOW);
    delay(200);

    digitalWrite(RST_PIN, HIGH);
    delay(200);
}

#include "epd7in5.h"

int EPD_dispIndex;        // The index of the e-Paper's type
int EPD_dispX, EPD_dispY; // Current pixel's coordinates (for 2.13 only)
void (*EPD_dispLoad)();   // Pointer on a image data writting function

void EPD_load()
{
    int index = 0;
    String p = server.arg(0);

    // Get the length of the image data begin
    int DataLength = p.length() - 8;

    // Enumerate all of image data bytes
    while (index < DataLength)
    {
        // Get current byte from obtained image data
        int value = ((int)p[index] - 'a') + (((int)p[index + 1] - 'a') << 4);
        ;
        for (int i = 0; i < 2; i++)
        {
            int temp = 0;
            if ((value & 0x03) == 0x03)
            {
                temp = 0x40;
            }
            else if ((value & 0x03) == 0x01)
            {
                temp = 0x30;
            }
            value = value >> 2;
            if ((value & 0x03) == 0x03)
            {
                temp |= 0x04;
            }
            else if ((value & 0x03) == 0x01)
            {
                temp |= 0x03;
            }
            value = value >> 2;
            EPD_SendData((byte)temp);
        }
        // Increment the current byte index on 2 characters
        index += 2;
    }
}

void EPD_show()
{
    EPD_SendCommand(0x12); //DISPLAY_REFRESH
    delay(100);
    EPD_WaitUntilIdle();

    // Sleep
    EPD_SendCommand(0x02); // POWER_OFF
    EPD_WaitUntilIdle();
    EPD_Send_1(0x07, 0xA5); // DEEP_SLEEP
}

struct EPD_dispInfo
{
    int (*init)();  // Initialization
    void (*chBk)(); // Black channel loading
    int next;       // Change channel code
    void (*chRd)(); // Red channel loading
    void (*show)(); // Show and sleep
    char *title;    // Title of an e-Paper
};

EPD_dispInfo EPD_dispMass = {EPD_7in5__init, EPD_load, -1, 0, EPD_show, "7.5 inch b"};

void EPD_dispInit()
{
    // Call initialization function
    EPD_dispMass.init();

    // Set loading function for black channel
    EPD_dispLoad = EPD_dispMass.chBk;

    // Set initial coordinates
    EPD_dispX = 0;
    EPD_dispY = 0;
}
