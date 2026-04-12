import tplMainboardC from './templates/mainboard/main.c?raw'
import tplModuleC from './templates/module/main.c?raw'
// Relative path to get into stm32/common from codegen/
import tplCanH from '../../stm32/common/eonix_can_protocol.h?raw'

export function generateProject(modules, configs, platform = 'Mega') {
  const files = {}

  // Detect whether the user configured a VL53 module and/or an MPU module.
  let hasVl53 = false
  let hasMpu = false
  let vl53Params = null
  let mpuParams = null

  modules.forEach(mod => {
    const conf = configs[mod.id]
    if (!conf || !conf.function) return

    if (mod.type === 'lidar' && conf.function === 'vl53_distance') {
      hasVl53 = true
      vl53Params = conf.params || {}
    }
    if (mod.type === 'imu' && conf.function === 'mpu_gyro') {
      hasMpu = true
      mpuParams = conf.params || {}
    }
  })

  if (platform === 'STM32') {
    // Generate the STM32 C / HAL project files
    files['mainboard/main.c'] = tplMainboardC
    files['module/main.c'] = tplModuleC
    files['common/eonix_can_protocol.h'] = tplCanH

    files['README_eonix_stm32.txt'] = [
      'Eonix STM32 Firmware Templates',
      '',
      'This generates the base C/HAL files for the motherboard and modules.',
      '1) Open STM32CubeIDE.',
      '2) Copy `mainboard/main.c` into your Nucleo Motherboard project`s Core/Src/ folder.',
      '3) Copy `module/main.c` into your Bluepill Module project`s Core/Src/ folder.',
      '4) Copy `common/eonix_can_protocol.h` to both projects` Core/Inc/ folders.',
      '',
      'Note: These templates are base starting points and must be integrated with your own CubeMX peripheral generation (I2C, CAN, USB).'
    ].join('\n')

    return files
  }

  // Otherwise, generate the Arduino fetcher sketch depending on the platform constraints
  const distSampling = vl53Params?.sampling_rate_hz ?? 20
  const distMeasMode = vl53Params?.measurement_mode ?? 0
  const distRangeMode = vl53Params?.distance_mode ?? 0

  const imuOdr = mpuParams?.odr_hz ?? 100
  const imuFs = mpuParams?.gyro_full_scale ?? 250
  const imuOutSel = mpuParams?.output_selection ?? 0

  let spiComments = ''
  let pinSs = ''

  switch (platform) {
    case 'Uno':
    case 'Nano':
      spiComments = [
        '// Arduino Uno/Nano default SPI pins:',
        '//   SCK  = D13',
        '//   MISO = D12',
        '//   MOSI = D11',
        '//   SS   = D10',
      ].join('\n')
      pinSs = '10'
      break
    case 'ESP32':
      spiComments = [
        '// ESP32 default VSPI pins:',
        '//   SCK  = D18',
        '//   MISO = D19',
        '//   MOSI = D23',
        '//   SS   = D5',
      ].join('\n')
      pinSs = '5'
      break
    case 'Mega':
    default:
      spiComments = [
        '// Arduino Mega default SPI pins:',
        '//   SCK  = D52',
        '//   MISO = D50',
        '//   MOSI = D51',
        '//   SS   = D53',
      ].join('\n')
      pinSs = '53'
      break
  }

  const arduinoSketch = [
    '/*',
    ` * Eonix ${platform} SPI Telemetry Fetcher`,
    ' *',
    ' * NOTE:',
    ' * - The Nucleo motherboard scales/manipulates module raw data.',
    ' * - This sketch only fetches the latest scaled values via SPI and prints them.',
    ' */',
    '',
    '#include <SPI.h>',
    '',
    'static const uint8_t CMD_TELEMETRY = 0x01;',
    '',
    '// --- SPI wiring (edit if your wiring differs) ---',
    spiComments,
    `static const uint8_t PIN_SS = ${pinSs};`,
    '',
    'struct TelemetryFrame {',
    '  uint16_t distance_mm;',
    '  int16_t gyro_x_centi_dps;',
    '  int16_t gyro_y_centi_dps;',
    '  uint16_t reserved;',
    '};',
    '',
    '// User reference configuration (does NOT change SPI protocol/logic):',
    `static const uint8_t EONIX_HAS_VL53 = ${hasVl53 ? 1 : 0};`,
    `static const uint8_t EONIX_HAS_MPU  = ${hasMpu ? 1 : 0};`,
    `static const uint32_t VL53_SAMPLING_RATE_HZ = ${Number(distSampling) || 20};`,
    `static const uint8_t VL53_MEASUREMENT_MODE   = ${Number(distMeasMode) || 0};`,
    `static const uint8_t VL53_DISTANCE_MODE      = ${Number(distRangeMode) || 0};`,
    `static const uint32_t MPU_ODR_HZ             = ${Number(imuOdr) || 100};`,
    `static const uint32_t MPU_GYRO_FULL_SCALE_DPS = ${Number(imuFs) || 250};`,
    `static const uint8_t MPU_OUTPUT_SELECTION   = ${Number(imuOutSel) || 0};`,
    '',
    'static uint16_t read_u16_le(const uint8_t *b) {',
    '  return (uint16_t)b[0] | ((uint16_t)b[1] << 8);',
    '}',
    '',
    'static int16_t read_s16_le(const uint8_t *b) {',
    '  return (int16_t)((uint16_t)b[0] | ((uint16_t)b[1] << 8));',
    '}',
    '',
    'void setup() {',
    '  Serial.begin(115200);',
    '  pinMode(PIN_SS, OUTPUT);',
    '  digitalWrite(PIN_SS, HIGH);',
    '',
    '  SPI.begin();',
    '  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));',
    '}',
    '',
    'void loop() {',
    '  uint8_t rx[8] = {0};',
    '',
    '  SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));',
    '  digitalWrite(PIN_SS, LOW);',
    '  SPI.transfer(CMD_TELEMETRY);',
    '  for (int i = 0; i < 8; i++) rx[i] = SPI.transfer(0x00);',
    '  digitalWrite(PIN_SS, HIGH);',
    '  SPI.endTransaction();',
    '',
    '  TelemetryFrame tf;',
    '  tf.distance_mm = read_u16_le(&rx[0]);',
    '  tf.gyro_x_centi_dps = read_s16_le(&rx[2]);',
    '  tf.gyro_y_centi_dps = read_s16_le(&rx[4]);',
    '  tf.reserved = read_u16_le(&rx[6]);',
    '',
    '  if (EONIX_HAS_VL53) {',
    '    Serial.print("VL53 distance_mm=");',
    '    Serial.print(tf.distance_mm);',
    '    Serial.print(" ");',
    '  }',
    '',
    '  if (EONIX_HAS_MPU) {',
    '    Serial.print("MPU gyroX_cdeg/s=");',
    '    Serial.print(tf.gyro_x_centi_dps);',
    '    Serial.print(" gyroY_cdeg/s=");',
    '    Serial.print(tf.gyro_y_centi_dps);',
    '    Serial.print(" ");',
    '  }',
    '',
    '  Serial.println();',
    '',
    '  delay(200);',
    '}',
    '',
  ].join('\n')

  const filename = `arduino_${platform.toLowerCase()}_spi_telemetry_fetcher.ino`
  files[filename] = arduinoSketch

  files['README_eonix_arduino.txt'] = [
    `Eonix ${platform} SPI Telemetry Fetcher`,
    '',
    'What to do:',
    '1) Flash the Nucleo motherboard with the matching SPI telemetry slave code.',
    `2) Wire ${platform} to Nucleo SPI. Check the .ino file for the exact pinout.`,
    `3) Upload \`${filename}\` to ${platform}.`,
    '4) Open Arduino Serial Monitor @ 115200 baud.',
    '',
    'Notes:',
    '- This sketch fetches the latest scaled values via SPI and prints them.',
    '- If you changed module configuration in the app, regenerate this sketch so the reference constants match.'
  ].join('\n')

  return files
}
