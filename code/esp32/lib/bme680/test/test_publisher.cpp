// /lib/bme680/test/test_bme680_publisher.cpp

#include <unity.h>
#include "bme680_driver.h"
#include "bme680_publisher.h"

BME680Driver bme680_driver;

void test_publish_bme680_returns_true() {
    bme680_driver.set_simulation_mode(true);
    TEST_ASSERT_TRUE(bme680_driver.begin());

    bool result = publish_bme680_data(bme680_driver);

    TEST_ASSERT_TRUE(result);
}

void setup() {
    delay(2000);

    UNITY_BEGIN();

    RUN_TEST(test_publish_bme680_returns_true);

    UNITY_END();
}

void loop() {
}