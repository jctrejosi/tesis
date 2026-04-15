#pragma once

namespace sensors {

  void begin();
  void update();
  void publish_now();
  void apply_bme680_config(const bme680::Config& cfg);

}