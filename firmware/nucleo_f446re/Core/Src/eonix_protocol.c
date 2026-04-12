#include "eonix_protocol.h"
#include "jsmn.h"

#include <string.h>
#include <stdio.h>

// --- Framing: [u32le len][json bytes] ---

#define RX_BUF_MAX (2048u)
#define FRAME_MAX  (1024u)

static uint8_t rx_buf[RX_BUF_MAX];
static size_t rx_len = 0;

static uint8_t frame_buf[FRAME_MAX];
static size_t frame_len = 0;
static uint8_t frame_ready = 0;

static uint32_t blink_rate_ms = 500;

static uint32_t read_u32le(const uint8_t *p) {
  return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}

static int json_tok_streq(const char *js, const jsmntok_t *tok, const char *s) {
  size_t slen = strlen(s);
  size_t tlen = (size_t)(tok->end - tok->start);
  return (tok->type == JSMN_STRING) && (tlen == slen) && (strncmp(js + tok->start, s, slen) == 0);
}

static int json_tok_to_u32(const char *js, const jsmntok_t *tok, uint32_t *out) {
  if (!tok || tok->type != JSMN_PRIMITIVE) return 0;
  char tmp[16];
  int n = tok->end - tok->start;
  if (n <= 0 || n >= (int)sizeof(tmp)) return 0;
  memcpy(tmp, js + tok->start, (size_t)n);
  tmp[n] = 0;
  unsigned long v = 0;
  if (sscanf(tmp, "%lu", &v) != 1) return 0;
  *out = (uint32_t)v;
  return 1;
}

static void send_json(const char *json) {
  uint32_t len = (uint32_t)strlen(json);
  uint8_t hdr[4] = { (uint8_t)(len & 0xFFu), (uint8_t)((len >> 8) & 0xFFu), (uint8_t)((len >> 16) & 0xFFu), (uint8_t)((len >> 24) & 0xFFu) };
  eonix_cdc_write(hdr, 4);
  eonix_cdc_write((const uint8_t *)json, (uint16_t)len);
}

static void handle_get_modules(void) {
  // One module: onboard LED
  // Keep IDs aligned with the desktop expectations: {id,type,name,canId,functions:[{name,parameters:[{name,type,default}]}]}
  const char *resp =
    "{\"cmd\":\"module_list\",\"modules\":[{"
      "\"id\":1,"
      "\"type\":\"gpio\","
      "\"name\":\"Onboard LED (LD2)\","
      "\"canId\":\"LD2\","
      "\"functions\":[{"
        "\"name\":\"blink\","
        "\"parameters\":[{\"name\":\"rate_ms\",\"type\":\"int\",\"default\":500}]"
      "}]"
    "}]}";
  send_json(resp);
}

static void handle_set_module_config(const char *js, jsmntok_t *toks, int tok_count) {
  // Expected:
  // { cmd:"set_module_config", moduleId:1, function:"blink", params:{ rate_ms:250 } }
  int i;
  uint32_t module_id = 0;
  const jsmntok_t *fn_tok = NULL;
  const jsmntok_t *rate_tok = NULL;

  for (i = 1; i < tok_count; i++) {
    if (json_tok_streq(js, &toks[i], "moduleId") && (i + 1) < tok_count) {
      (void)json_tok_to_u32(js, &toks[i + 1], &module_id);
      i++;
    } else if (json_tok_streq(js, &toks[i], "function") && (i + 1) < tok_count) {
      fn_tok = &toks[i + 1];
      i++;
    } else if (json_tok_streq(js, &toks[i], "rate_ms") && (i + 1) < tok_count) {
      // Some senders might flatten params (future-proof)
      rate_tok = &toks[i + 1];
      i++;
    } else if (json_tok_streq(js, &toks[i], "params") && (i + 1) < tok_count) {
      // Parse inside params object: scan for "rate_ms"
      int j = i + 1;
      if (toks[j].type == JSMN_OBJECT) {
        int obj_end = toks[j].end;
        for (int k = j + 1; k < tok_count; k++) {
          if (toks[k].start >= obj_end) break;
          if (json_tok_streq(js, &toks[k], "rate_ms") && (k + 1) < tok_count) {
            rate_tok = &toks[k + 1];
            break;
          }
        }
      }
      i++;
    }
  }

  if (module_id != 1 || !fn_tok || !json_tok_streq(js, fn_tok, "blink") || !rate_tok) {
    send_json("{\"cmd\":\"ack\",\"ok\":false,\"ref\":\"set_module_config\"}");
    return;
  }

  uint32_t new_rate = 0;
  if (!json_tok_to_u32(js, rate_tok, &new_rate)) {
    send_json("{\"cmd\":\"ack\",\"ok\":false,\"ref\":\"set_module_config\"}");
    return;
  }
  if (new_rate < 20) new_rate = 20;
  if (new_rate > 10000) new_rate = 10000;
  blink_rate_ms = new_rate;

  send_json("{\"cmd\":\"ack\",\"ok\":true,\"ref\":\"set_module_config\"}");
}

static void handle_frame(const uint8_t *buf, size_t len) {
  // buf is JSON bytes, not null-terminated
  char js[FRAME_MAX + 1];
  if (len > FRAME_MAX) return;
  memcpy(js, buf, len);
  js[len] = 0;

  jsmn_parser p;
  jsmntok_t toks[64];
  jsmn_init(&p);
  int r = jsmn_parse(&p, js, len, toks, (unsigned int)(sizeof(toks) / sizeof(toks[0])));
  if (r < 0) return;
  if (r < 1 || toks[0].type != JSMN_OBJECT) return;

  // Find cmd
  const jsmntok_t *cmd_tok = NULL;
  for (int i = 1; i < r; i++) {
    if (json_tok_streq(js, &toks[i], "cmd") && (i + 1) < r) {
      cmd_tok = &toks[i + 1];
      break;
    }
  }
  if (!cmd_tok) return;

  if (json_tok_streq(js, cmd_tok, "get_modules")) {
    handle_get_modules();
  } else if (json_tok_streq(js, cmd_tok, "set_module_config")) {
    handle_set_module_config(js, toks, r);
  } else {
    // Unknown command: ignore but keep link alive
    send_json("{\"cmd\":\"ack\",\"ok\":false,\"ref\":\"unknown\"}");
  }
}

void eonix_protocol_feed(const uint8_t *data, size_t len) {
  if (!data || !len) return;
  if ((rx_len + len) > RX_BUF_MAX) {
    // Drop buffer on overflow
    rx_len = 0;
    return;
  }
  memcpy(&rx_buf[rx_len], data, len);
  rx_len += len;

  // Try to extract one frame at a time; keep only the latest complete frame
  while (rx_len >= 4) {
    uint32_t n = read_u32le(rx_buf);
    if (n > FRAME_MAX) {
      rx_len = 0;
      return;
    }
    if (rx_len < (size_t)(4 + n)) return;

    memcpy(frame_buf, &rx_buf[4], n);
    frame_len = n;
    frame_ready = 1;

    // Consume
    size_t remaining = rx_len - (size_t)(4 + n);
    if (remaining) memmove(rx_buf, &rx_buf[4 + n], remaining);
    rx_len = remaining;
  }
}

void eonix_protocol_poll(void) {
  if (!frame_ready) return;
  frame_ready = 0;
  handle_frame(frame_buf, frame_len);
}

uint32_t eonix_get_blink_rate_ms(void) {
  return blink_rate_ms;
}

