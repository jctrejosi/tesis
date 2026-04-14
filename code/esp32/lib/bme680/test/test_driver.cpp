#include <Arduino.h>
#include <unity.h>
#include "bme680_driver.h"

BME680Driver bme680;

void test_simulator_returns_valid_data() {
    BME680Data data = bme680.read();

    TEST_ASSERT_TRUE(data.temperature > 0);
    TEST_ASSERT_TRUE(data.humidity >= 0);
    TEST_ASSERT_TRUE(data.pressure > 0);
    TEST_ASSERT_TRUE(data.gas_resistance > 0);
}

void setup() {
    UNITY_BEGIN();
    bme680.begin();
    RUN_TEST(test_simulator_returns_valid_data);
    UNITY_END();
}

void loop() {}