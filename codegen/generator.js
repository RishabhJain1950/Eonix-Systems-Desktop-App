const ARDUINO_TARGETS = {
  'Arduino Uno': { ssPin: 10 },
  'Arduino Mega': { ssPin: 53 },
}

const USER_SECTION_NAMES = [
  'Includes',
  'Globals',
  'Setup',
  'Loop',
  'Functions',
]

function selectedTestModule(modules, configs) {
  const module = modules.find((item) => item.descriptor === 'TEST_LETTER_NUMBER' || item.type === 'TEST_LETTER_NUMBER')
  if (!module) return null

  const config = configs[module.uid] || configs[module.id] || {}
  return {
    role: sanitizeIdentifier(config.role || module.role || 'test_module_1'),
    letter: String(config.config?.letter ?? module.letter ?? 'A').slice(0, 1),
    number: Number(config.config?.number ?? module.number ?? 123),
    led: Boolean(config.config?.led ?? module.led ?? module.ledState),
  }
}

function sanitizeIdentifier(value) {
  const normalized = String(value || 'test_module_1').replace(/[^A-Za-z0-9_]/g, '_')
  return /^[A-Za-z_]/.test(normalized) ? normalized : `role_${normalized}`
}

function escapeCharLiteral(value) {
  const char = String(value || 'A').slice(0, 1)
  if (char === "'") return "\\'"
  if (char === '\\') return '\\\\'
  return char && char.charCodeAt(0) <= 127 ? char : 'A'
}

function extractUserSections(existingContent = '') {
  const sections = {}

  USER_SECTION_NAMES.forEach((sectionName) => {
    const pattern = new RegExp(
      `/\\* USER CODE BEGIN ${sectionName} \\*/([\\s\\S]*?)/\\* USER CODE END ${sectionName} \\*/`,
      'm'
    )
    const match = existingContent.match(pattern)
    if (match) sections[sectionName] = match[1].trim()
  })

  return sections
}

function userSection(name, defaults, preservedSections) {
  const body = preservedSections[name] ?? defaults
  const content = body ? `\n${body}\n` : '\n'
  return `/* USER CODE BEGIN ${name} */${content}/* USER CODE END ${name} */`
}

function generateArduinoSketch(modules, configs, target, previousContent) {
  const profile = ARDUINO_TARGETS[target] || ARDUINO_TARGETS['Arduino Uno']
  const preservedSections = extractUserSections(previousContent)
  const module = selectedTestModule(modules, configs) || {
    role: 'test_module_1',
    letter: 'A',
    number: 123,
    led: false,
  }

  const setupExample = [
    'Serial.begin(115200);',
    'while (!Serial) {',
    '  ;',
    '}',
  ].join('\n')

  const loopExample = [
    `if (eonix.${module.role}.getNumber() > 100) {`,
    `  eonix.${module.role}.setLed(true);`,
    '} else {',
    `  eonix.${module.role}.setLed(false);`,
    '}',
    '',
    'Serial.print("Letter: ");',
    `Serial.println(eonix.${module.role}.getLetter());`,
    'Serial.print("Number: ");',
    `Serial.println(eonix.${module.role}.getNumber());`,
    'delay(500);',
  ].join('\n')

  return [
    '#include <SPI.h>',
    userSection('Includes', '', preservedSections),
    '',
    `static const uint8_t EONIX_SS_PIN = ${profile.ssPin};`,
    '',
    'struct EonixSpiPacket {',
    "  char magic[2];",
    '  uint8_t version;',
    '  char letter;',
    '  int16_t number;',
    '  uint8_t status;',
    '  uint8_t checksum;',
    '};',
    '',
    'static uint8_t eonixChecksum(const uint8_t *bytes) {',
    '  uint8_t checksum = 0;',
    '  for (uint8_t i = 0; i < 7; i++) {',
    '    checksum ^= bytes[i];',
    '  }',
    '  return checksum;',
    '}',
    '',
    'class EonixTestLetterNumberRole {',
    'public:',
    `  EonixTestLetterNumberRole() : letter_('${escapeCharLiteral(module.letter)}'), number_(${Number.isFinite(module.number) ? module.number : 123}), ledState_(${module.led ? 'true' : 'false'}), pendingLedCommand_(false), pendingLedState_(false), online_(false) {}`,
    '',
    '  char getLetter() const { return letter_; }',
    '  int16_t getNumber() const { return number_; }',
    '  bool getLedState() const { return ledState_; }',
    '  bool isOnline() const { return online_; }',
    '',
    '  void setLed(bool enabled) {',
    '    pendingLedState_ = enabled;',
    '    pendingLedCommand_ = true;',
    '  }',
    '',
    '  bool consumeLedCommand(bool *enabled) {',
    '    if (!pendingLedCommand_) return false;',
    '    *enabled = pendingLedState_;',
    '    pendingLedCommand_ = false;',
    '    return true;',
    '  }',
    '',
    '  void applyPacket(const EonixSpiPacket &packet) {',
    '    letter_ = packet.letter;',
    '    number_ = packet.number;',
    '    online_ = true;',
    '    ledState_ = (packet.status & 0x01) != 0;',
    '  }',
    '',
    'private:',
    '  char letter_;',
    '  int16_t number_;',
    '  bool ledState_;',
    '  bool pendingLedCommand_;',
    '  bool pendingLedState_;',
    '  bool online_;',
    '};',
    '',
    'class EonixSAM {',
    'public:',
    `  EonixTestLetterNumberRole ${module.role};`,
    '',
    '  void begin() {',
    '    pinMode(EONIX_SS_PIN, OUTPUT);',
    '    digitalWrite(EONIX_SS_PIN, HIGH);',
    '    SPI.begin();',
    '  }',
    '',
    '  bool update() {',
    '    uint8_t tx[8] = {0xE0, 0x01, 0, 0, 0, 0, 0, 0};',
    '    uint8_t rx[8] = {0};',
    '    bool requestedLedState = false;',
    '',
    `    if (${module.role}.consumeLedCommand(&requestedLedState)) {`,
    '      tx[2] = 1;',
    '      tx[3] = requestedLedState ? 1 : 0;',
    '    }',
    '',
    '    SPI.beginTransaction(SPISettings(1000000, MSBFIRST, SPI_MODE0));',
    '    digitalWrite(EONIX_SS_PIN, LOW);',
    '    for (uint8_t i = 0; i < 8; i++) {',
    '      rx[i] = SPI.transfer(tx[i]);',
    '    }',
    '    digitalWrite(EONIX_SS_PIN, HIGH);',
    '    SPI.endTransaction();',
    '',
    "    if (rx[0] != 'E' || rx[1] != 'X' || rx[2] != 1) {",
    '      return false;',
    '    }',
    '    if (eonixChecksum(rx) != rx[7]) {',
    '      return false;',
    '    }',
    '',
    '    EonixSpiPacket packet;',
    "    packet.magic[0] = 'E';",
    "    packet.magic[1] = 'X';",
    '    packet.version = rx[2];',
    '    packet.letter = (char)rx[3];',
    '    packet.number = (int16_t)((uint16_t)rx[4] | ((uint16_t)rx[5] << 8));',
    '    packet.status = rx[6];',
    '    packet.checksum = rx[7];',
    '',
    `    ${module.role}.applyPacket(packet);`,
    '    return true;',
    '  }',
    '};',
    '',
    'EonixSAM eonix;',
    userSection('Globals', '', preservedSections),
    '',
    'void setup() {',
    '  eonix.begin();',
    indentUserSection(userSection('Setup', setupExample, preservedSections), 2),
    '}',
    '',
    'void loop() {',
    '  eonix.update();',
    indentUserSection(userSection('Loop', loopExample, preservedSections), 2),
    '}',
    '',
    userSection('Functions', '', preservedSections),
    '',
  ].join('\n')
}

function indentUserSection(section, spaces) {
  const prefix = ' '.repeat(spaces)
  return section.split('\n').map((line) => `${prefix}${line}`).join('\n')
}

export function generateProject(modules, configs, target = 'Arduino Uno', previousFiles = null) {
  const filename = `eonix_${target.toLowerCase().replace(/\s+/g, '_')}_test_letter_number.ino`
  const previousContent = previousFiles?.[filename] || ''

  return {
    [filename]: generateArduinoSketch(modules, configs, target, previousContent),
  }
}
