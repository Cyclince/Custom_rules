// AI 节点检测脚本，制作 by 翀𝙡𝙧 TG：https://t.me/chong_redaily
// 更新时间：2026-11-03
// 功能简介：检测 ChatGPT、Claude、Gemini 的探针连通性，并展示出口 IP、地区、ASN、网络类型和风险评分。

// Loon host adapter: independently implemented following Script-Hub's compatibility-layer approach.
// Reference: https://github.com/Script-Hub-Org/Script-Hub/blob/main/script-converter.js
const __loonParams = typeof $environment !== "undefined" && $environment.params || {};
const __loonInfo = __loonParams.nodeInfo || {};
const __loonNode = __loonInfo.name || __loonParams.node || __loonParams.policyGroup || "";
const __loonNativeDone = $done;
let __loonFinished = false;
const __loonDone = value => {
  if (__loonFinished) return;
  __loonFinished = true;
  __loonNativeDone(value);
};
// Loon may not expose clearTimeout: use cancellable callback tokens.
const __loonNativeTimer = setTimeout;
const __loonTimers = new Set();
const __loonSetTimeout = (fn, ms, ...args) => {
  const token = {};
  __loonTimers.add(token);
  __loonNativeTimer(() => {
    if (__loonTimers.delete(token) && !__loonFinished) fn(...args);
  }, ms);
  return token;
};
const __loonClearTimeout = token => __loonTimers.delete(token);
const __loonTask = {
  fetch(request) {
    return new Promise((resolve, reject) => {
      const req = typeof request === "string" ? {url: request} : Object.assign({}, request);
      const opts = req.opts || {};
      const policy = opts.policy || __loonNode;
      if (policy) req.node = /^direct$/i.test(policy) ? "DIRECT" : policy;
      if (typeof opts.redirection === "boolean") req["auto-redirect"] = opts.redirection;
      delete req.opts;
      const method = String(req.method || "GET").toLowerCase();
      delete req.method;
      if (typeof $httpClient[method] !== "function") return reject(new Error("Unsupported method: " + method));
      const timeout = Number(req.timeout) > 0 ? Number(req.timeout) : 7000;
      req.timeout = timeout;
      let settled = false;
      const timer = __loonSetTimeout(() => {
        if (!settled) { settled = true; reject(new Error("request timeout")); }
      }, timeout);
      function callback(error, response, data) {
        if (settled) return;
        settled = true;
        __loonClearTimeout(timer);
        if (error || !response) return reject(new Error(String(error && (error.message || error.error) || error || "Empty HTTP response")));
        resolve(Object.assign({}, response, {
          statusCode: Number(response.status || response.statusCode || 0),
          body: data == null ? "" : data,
          headers: response.headers || {}
        }));
      }
      try { $httpClient[method](req, callback); }
      catch (error) { callback(error); }
    });
  }
};
const __loonPrefs = {
  valueForKey: key => $persistentStore.read(key),
  setValueForKey: (value, key) => $persistentStore.write(value, key)
};
// Keep the detection body isolated; never overwrite Loon's native $environment.
(function ($environment, $task, $prefs, $done, setTimeout, clearTimeout) {

/**
 * AI 节点检测 v2.6.2 - Quantumult X
 *
 * Geo / ASN / ISP:
 *   Net.Coffee -> IPQuery -> ipapi.is
 *   ASN 全部失败 -> IP.SB 条件兜底
 *
 * 风控 / 类型:
 *   Net.Coffee -> IPQuery -> ipapi.is
 *
 * Gemini:
 *   Google 出口落入 CN，而节点自身非 CN
 *   -> ❗️ 送中 IP
 *
 * [Script]
 * Loon: 使用随附的 Scripts.conf 中对应 generic 入口。
 */


/* =========================================================
 * Config
 * ========================================================= */

const POLICY = (() => {
  try {
    return (
      typeof $environment !== "undefined" &&
      $environment.params
    )
      ? String($environment.params)
      : "";
  } catch (_) {
    return "";
  }
})();


const TIMEOUT = {
  probe: 2800,
  meta: 1800,
  egress: 1500,
  asnFallback: 1500
};


const BLOCKED = {
  chatgpt: ["CN", "HK", "MO", "RU", "BY", "IR", "KP", "SY", "CU"],
  claude:  ["CN", "HK", "MO", "RU", "BY", "IR", "KP", "SY", "CU"],
  gemini:  ["CN", "KP", "SY"]
};


const CACHE = {};


const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";


/* =========================================================
 * Utils
 * ========================================================= */

const sleep = ms =>
  new Promise(resolve =>
    setTimeout(resolve, ms)
  );


function parseJSON(s) {
  try {
    return JSON.parse(s || "{}");
  } catch (_) {
    return null;
  }
}


function esc(s) {
  return String(
    s == null
      ? ""
      : s
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


function get(obj, path) {
  let cur = obj;

  for (const key of String(path).split(".")) {
    if (
      cur == null ||
      typeof cur !== "object"
    ) {
      return undefined;
    }

    cur = cur[key];
  }

  return cur;
}


function pick(obj, paths, fallback = "") {
  for (const path of paths) {
    const value = get(obj, path);

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return fallback;
}


function bool(v) {
  if (
    v === true ||
    v === 1 ||
    v === "1"
  ) {
    return true;
  }

  if (
    v === false ||
    v === 0 ||
    v === "0"
  ) {
    return false;
  }

  if (typeof v === "string") {
    const s = v.trim().toLowerCase();

    if (/^(true|yes|on|y)$/.test(s))
      return true;

    if (/^(false|no|off|n)$/.test(s))
      return false;
  }

  return null;
}


/*
 * API 字段递归查找。
 */

function deepFind(
  obj,
  names,
  depth = 0
) {
  if (
    !obj ||
    typeof obj !== "object" ||
    depth > 5
  ) {
    return undefined;
  }

  const wanted = names.map(
    x =>
      String(x)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
  );

  for (const key of Object.keys(obj)) {
    const normalized =
      String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    if (wanted.includes(normalized)) {
      const value = obj[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }
  }

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (
      value &&
      typeof value === "object"
    ) {
      const found =
        deepFind(
          value,
          names,
          depth + 1
        );

      if (
        found !== undefined
      ) {
        return found;
      }
    }
  }

  return undefined;
}


/* =========================================================
 * HTTP
 * ========================================================= */

function request(
  url,
  ms = TIMEOUT.meta,
  accept = "*/*"
) {
  const req = {
    url,
    method: "GET",
    timeout: ms,

    headers: {
      "User-Agent": UA,
      "Accept": accept,
      "Accept-Language":
        "zh-CN,zh;q=0.9,en;q=0.8"
    }
  };


  if (POLICY) {
    req.opts = {
      policy: POLICY,
      redirection: true
    };
  }


  const fetchTask =
    $task.fetch(req)

      .then(r => ({
        status: Number(
          r.statusCode ||
          r.status ||
          0
        ),

        body:
          r.body || "",

        timeout:
          false
      }))

      .catch(error => ({
        status: 0,
        body: "",
        timeout: /timeout|timed out/i.test(String(error && (error.error || error.message) || error))
      }));


  const timer =
    sleep(ms)

      .then(() => ({
        status: 0,
        body: "",
        timeout: true
      }));


  return Promise.race([
    fetchTask,
    timer
  ]);
}


async function timed(
  url,
  ms = TIMEOUT.probe
) {
  const start =
    Date.now();

  const res =
    await request(
      url,
      ms
    );

  return {
    res,
    latency:
      Date.now() -
      start
  };
}


/* =========================================================
 * IP
 * ========================================================= */

function isIPv6(ip) {
    if (typeof ip !== "string") return false;
    let value = ip.trim().replace(/^\[|\]$/g, "");
    if (!value.includes(":")) return false;
    if (value.includes(".")) {
        const tail = value.slice(value.lastIndexOf(":") + 1);
        if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(tail) ||
            !tail.split(".").every(x => Number(x) <= 255 && (x === "0" || x[0] !== "0"))) return false;
        value = value.slice(0, value.lastIndexOf(":") + 1) + "0:0";
    }
    const halves = value.split("::");
    if (halves.length > 2) return false;
    const parts = halves.reduce((all, half) => all.concat(half ? half.split(":") : []), []);
    if (!parts.every(x => /^[0-9a-f]{1,4}$/i.test(x))) return false;
    return halves.length === 2 ? parts.length < 8 : parts.length === 8;
}

function normalizeIP(ip) {
  const s =
    String(ip || "")
      .trim()
      .replace(/^\[|\]$/g, "");


  if (
    /^\d{1,3}(\.\d{1,3}){3}$/
      .test(s)
  ) {
    return s
      .split(".")
      .every(
        x =>
          Number(x) >= 0 &&
          Number(x) <= 255
      )
      ? s
      : "";
  }


  return (
    isIPv6(s)
  )
    ? s
    : "";
}


function flag(cc) {
  if (
    !/^[A-Z]{2}$/i.test(
      cc || ""
    )
  ) {
    return "🌐";
  }


  return String.fromCodePoint(
    ...String(cc)
      .toUpperCase()
      .split("")
      .map(
        c =>
          127397 +
          c.charCodeAt(0)
      )
  );
}


function trace(body) {
  const out = {};

  String(body || "")
    .split(/\r?\n/)
    .forEach(line => {
      const i =
        line.indexOf("=");

      if (i > 0) {
        out[
          line.slice(0, i)
        ] =
          line.slice(i + 1);
      }
    });

  return out;
}


/* =========================================================
 * 节点默认出口
 * ========================================================= */

async function getNodeIP() {
  const [
    pure,
    ipify
  ] =
    await Promise.all([

      request(
        "https://my.ippure.com/v1/info",
        TIMEOUT.egress
      ),

      request(
        "https://api.ipify.org?format=json",
        TIMEOUT.egress
      )

    ]);


  const p =
    parseJSON(
      pure.body
    );

  const i =
    parseJSON(
      ipify.body
    );


  const pureIP =
    normalizeIP(
      pick(
        p || {},
        [
          "ip",
          "data.ip",
          "query",
          "address"
        ],
        ""
      )
    )
    ||
    normalizeIP(
      deepFind(
        p,
        [
          "ip",
          "ipaddress"
        ]
      )
    );


  return (
    pureIP
    ||
    normalizeIP(
      i && i.ip
    )
    ||
    ""
  );
}


/* =========================================================
 * Gemini / Google 出口
 * ========================================================= */

function googleIP(body) {
  const match =
    String(body || "")
      .match(
        /(?:IP\s*(?:address|地址|位址)\s*[:：]\s*)([0-9a-fA-F:.]+)/i
      );

  return match
    ? normalizeIP(
        match[1]
      )
    : "";
}


async function getGoogleIP() {
  const r =
    await request(

      "https://ipv4.google.com/sorry/index" +
      "?continue=https%3A%2F%2Fgemini.google.com%2Fapp&hl=en",

      TIMEOUT.egress

    );

  return googleIP(
    r.body
  );
}


/* =========================================================
 * ASN
 * ========================================================= */

function parseASN(v) {
  if (v == null)
    return null;


  if (
    typeof v === "number" &&
    v > 0
  ) {
    return {
      asn:
        "AS" +
        Math.trunc(v),

      org:
        ""
    };
  }


  if (
    typeof v === "string"
  ) {
    const s =
      v.trim();

    const match =
      s.match(
        /AS\s*(\d+)\s*(.*)/i
      );


    if (
      match &&
      Number(match[1]) > 0
    ) {
      return {
        asn:
          "AS" +
          match[1],

        org:
          String(
            match[2] || ""
          )
            .replace(
              /^[\s·\-]+/,
              ""
            )
      };
    }


    if (
      /^\d+$/.test(s) &&
      Number(s) > 0
    ) {
      return {
        asn:
          "AS" +
          s,

        org:
          ""
      };
    }
  }


  if (
    typeof v === "object"
  ) {
    const parsed =
      parseASN(

        pick(
          v,
          [
            "asn",
            "as",
            "number",
            "asn_number",
            "as_number"
          ],
          null
        )

      );


    if (
      parsed &&
      !parsed.org
    ) {
      parsed.org =
        String(

          pick(
            v,
            [
              "org",
              "organization",
              "name",
              "isp"
            ],
            ""
          )

        );
    }


    return parsed;
  }


  return null;
}


/* =========================================================
 * 数据源
 * ========================================================= */

async function coffee(ip) {
  const base =
    "https://ip.net.coffee/api/";


  const [
    geo,
    risk
  ] =
    await Promise.all([

      request(
        base +
        "geoip/" +
        encodeURIComponent(ip)
      ),

      request(
        base +
        "iprisk/" +
        encodeURIComponent(ip)
      )

    ]);


  return {
    geo:
      geo.status >= 200 &&
      geo.status < 300
        ? parseJSON(
            geo.body
          )
        : null,

    risk:
      risk.status >= 200 &&
      risk.status < 300
        ? parseJSON(
            risk.body
          )
        : null
  };
}


async function ipquery(ip) {
  const r =
    await request(
      "https://api.ipquery.io/" +
      encodeURIComponent(ip)
    );


  return (
    r.status >= 200 &&
    r.status < 300
  )
    ? parseJSON(
        r.body
      )
    : null;
}


async function ipapi(ip) {
  const r =
    await request(
      "https://api.ipapi.is/?q=" +
      encodeURIComponent(ip)
    );


  const d =
    parseJSON(
      r.body
    );


  return (
    r.status >= 200 &&
    r.status < 300 &&
    d &&
    !d.error
  )
    ? d
    : null;
}


/* =========================================================
 * IP.SB ASN fallback
 *
 * 仅前三源全部没有 ASN 时调用。
 * 不覆盖已有 ASN。
 * ========================================================= */

async function ipSB(ip) {
  const r =
    await request(

      "https://api.ip.sb/geoip/" +
      encodeURIComponent(ip),

      TIMEOUT.asnFallback,

      "application/json"

    );


  if (
    r.status < 200 ||
    r.status >= 300
  ) {
    return null;
  }


  return parseJSON(
    r.body
  );
}


/* =========================================================
 * Geo / ASN / ISP
 * ========================================================= */

function sourceMeta(
  type,
  d
) {
  if (!d)
    return {};


  if (
    type === "coffee"
  ) {
    const a =
      parseASN(

        pick(
          d,
          [
            "asn",
            "as",
            "network.asn",
            "connection.asn"
          ],
          null
        )

        ||

        deepFind(
          d,
          [
            "asn",
            "asnumber"
          ]
        )

      );


    return {
      cc:
        String(
          pick(
            d,
            [
              "countryCode",
              "country_code",
              "cc",
              "location.country_code"
            ],
            ""
          )
        )
          .toUpperCase(),

      country:
        String(
          pick(
            d,
            [
              "country",
              "country_name",
              "location.country"
            ],
            ""
          )
        ),

      city:
        String(
          pick(
            d,
            [
              "city",
              "region",
              "state",
              "location.city"
            ],
            ""
          )
        ),

      asn:
        a && a.asn
          ? a.asn
          : "",

      org:
        String(
          pick(
            d,
            [
              "isp",
              "org",
              "organization",
              "network.organization",
              "connection.org"
            ],
            ""
          )
        )
        ||
        (
          a &&
          a.org
        )
        ||
        ""
    };
  }


  if (
    type === "query"
  ) {
    const a =
      parseASN(

        pick(
          d,
          [
            "isp.asn",
            "asn"
          ],
          null
        )

      );


    return {
      cc:
        String(
          pick(
            d,
            [
              "location.country_code",
              "country_code"
            ],
            ""
          )
        )
          .toUpperCase(),

      country:
        String(
          pick(
            d,
            [
              "location.country",
              "country"
            ],
            ""
          )
        ),

      city:
        String(
          pick(
            d,
            [
              "location.city",
              "location.state"
            ],
            ""
          )
        ),

      asn:
        a && a.asn
          ? a.asn
          : "",

      org:
        String(
          pick(
            d,
            [
              "isp.org",
              "isp.isp",
              "organization"
            ],
            ""
          )
        )
        ||
        (
          a &&
          a.org
        )
        ||
        ""
    };
  }


  const a =
    parseASN(

      pick(
        d,
        [
          "asn",
          "autonomous_system.asn"
        ],
        null
      )

    );


  return {
    cc:
      String(
        pick(
          d,
          [
            "country_code",
            "location.country_code"
          ],
          ""
        )
      )
        .toUpperCase(),

    country:
      String(
        pick(
          d,
          [
            "country",
            "country_name"
          ],
          ""
        )
      ),

    city:
      String(
        pick(
          d,
          [
            "city",
            "region",
            "state"
          ],
          ""
        )
      ),

    asn:
      a && a.asn
        ? a.asn
        : "",

    org:
      String(
        pick(
          d,
          [
            "company.name",
            "organization",
            "isp",
            "autonomous_system.name"
          ],
          ""
        )
      )
      ||
      (
        a &&
        a.org
      )
      ||
      ""
  };
}


/* =========================================================
 * Score
 * ========================================================= */

function getScore(
  coffeeRisk,
  query
) {
  let score =
    Number(

      pick(
        coffeeRisk || {},
        [
          "trustScore",
          "trust_score",
          "score",
          "data.trustScore",
          "data.trust_score",
          "data.score"
        ],
        NaN
      )

    );


  if (
    !Number.isFinite(score)
  ) {
    const risk =
      Number(

        pick(
          query || {},
          [
            "risk.risk_score",
            "risk_score"
          ],
          NaN
        )

      );


    score =
      Number.isFinite(risk)
        ? 100 - risk
        : NaN;
  }


  return Number.isFinite(score)
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(score)
        )
      )
    : null;
}


function scoreName(n) {
  if (n == null)
    return "未知";

  if (n >= 95)
    return "极度纯净";

  if (n >= 90)
    return "非常纯净";

  if (n >= 80)
    return "较为纯净";

  if (n >= 60)
    return "一般";

  if (n >= 40)
    return "风险偏高";

  return "高风险";
}


/* =========================================================
 * Type
 * ========================================================= */

function getType(
  risk,
  query,
  api
) {
  risk =
    risk || {};

  query =
    query || {};

  api =
    api || {};


  /*
   * Net.Coffee 文本类型
   */

  const raw =
    String(

      deepFind(
        risk,
        [
          "type",
          "iptype",
          "networktype",
          "usagetype"
        ]
      )

      ||

      ""

    )
      .toLowerCase();


  if (
    /residential|home.?broadband|住宅|家庭/.test(raw)
  ) {
    return "家庭住宅 IP";
  }


  if (
    /mobile|cellular|移动/.test(raw)
  ) {
    return "移动网络 IP";
  }


  if (
    /hosting|datacenter|data.?center|机房|数据中心/.test(raw)
  ) {
    return "数据中心 IP";
  }


  if (
    /native|原生/.test(raw)
  ) {
    return "原生 IP";
  }


  /*
   * Net.Coffee Boolean
   */

  const residential =
    bool(
      deepFind(
        risk,
        [
          "residential",
          "isresidential"
        ]
      )
    );


  const mobile =
    bool(
      deepFind(
        risk,
        [
          "mobile",
          "ismobile"
        ]
      )
    );


  const datacenter =
    bool(
      deepFind(
        risk,
        [
          "hosting",
          "ishosting",
          "datacenter",
          "isdatacenter"
        ]
      )
    );


  const native =
    bool(
      deepFind(
        risk,
        [
          "native",
          "isnative"
        ]
      )
    );


  if (
    residential === true
  ) {
    return "家庭住宅 IP";
  }


  if (
    mobile === true
  ) {
    return "移动网络 IP";
  }


  if (
    datacenter === true
  ) {
    return "数据中心 IP";
  }


  if (
    native === true
  ) {
    return "原生 IP";
  }


  /*
   * IPQuery
   */

  if (
    bool(
      pick(
        query,
        [
          "risk.is_mobile",
          "is_mobile"
        ],
        undefined
      )
    ) === true
  ) {
    return "移动网络 IP";
  }


  if (
    bool(
      pick(
        query,
        [
          "risk.is_datacenter",
          "is_datacenter"
        ],
        undefined
      )
    ) === true
  ) {
    return "数据中心 IP";
  }


  if (
    bool(
      pick(
        query,
        [
          "risk.is_vpn",
          "is_vpn"
        ],
        undefined
      )
    ) === true
  ) {
    return "VPN 出口";
  }


  if (
    bool(
      pick(
        query,
        [
          "risk.is_proxy",
          "is_proxy"
        ],
        undefined
      )
    ) === true
  ) {
    return "代理 IP";
  }


  /*
   * ipapi.is
   */

  if (
    bool(
      pick(
        api,
        [
          "is_mobile",
          "company.is_mobile"
        ],
        undefined
      )
    ) === true
  ) {
    return "移动网络 IP";
  }


  if (
    bool(
      pick(
        api,
        [
          "is_datacenter",
          "company.is_datacenter"
        ],
        undefined
      )
    ) === true
  ) {
    return "数据中心 IP";
  }


  if (
    bool(
      pick(
        api,
        [
          "is_vpn"
        ],
        undefined
      )
    ) === true
  ) {
    return "VPN 出口";
  }


  if (
    bool(
      pick(
        api,
        [
          "is_proxy"
        ],
        undefined
      )
    ) === true
  ) {
    return "代理 IP";
  }


  const companyType =
    String(

      pick(
        api,
        [
          "company.type",
          "asn.type"
        ],
        ""
      )

    )
      .toLowerCase();


  if (
    /hosting|datacenter/.test(companyType)
  ) {
    return "数据中心 IP";
  }


  if (
    /isp/.test(companyType)
  ) {
    return "ISP 网络";
  }


  if (
    /business/.test(companyType)
  ) {
    return "企业网络";
  }


  return "未知";
}


/* =========================================================
 * Profile
 * ========================================================= */

function profile(ip) {
  if (!ip)
    return Promise.resolve(null);


  if (CACHE[ip])
    return CACHE[ip];


  CACHE[ip] =
    (async () => {

      /*
       * 三个主数据源并发。
       */

      const [
        c,
        q,
        a
      ] =
        await Promise.all([

          coffee(ip),

          ipquery(ip),

          ipapi(ip)

        ]);


      const sources = [

        sourceMeta(
          "coffee",
          c.geo
        ),

        sourceMeta(
          "query",
          q
        ),

        sourceMeta(
          "api",
          a
        )

      ];


      /*
       * v2.6.2
       *
       * 只有前三个数据源全部没有 ASN 时，
       * 才调用 IP.SB。
       *
       * 已经取得 ASN 时绝不覆盖。
       */

      if (
        !sources.some(
          x =>
            x &&
            x.asn
        )
      ) {

        const sb =
          await ipSB(ip);


        if (sb) {

          const sbASN =
            parseASN(
              sb.asn
            );


          sources.push({

            cc:
              String(
                sb.country_code ||
                ""
              )
                .toUpperCase(),

            country:
              String(
                sb.country ||
                ""
              ),

            city:
              String(
                sb.city ||
                sb.region ||
                ""
              ),

            asn:
              sbASN &&
              sbASN.asn
                ? sbASN.asn
                : "",

            org:
              String(
                sb.asn_organization ||
                sb.isp ||
                sb.organization ||
                ""
              )

          });

        }

      }


      /*
       * 锁定最高优先级国家，
       * 防止不同数据库跨国家拼接。
       */

      const primary =
        sources.find(
          x =>
            x.cc ||
            x.country
        )
        ||
        {};


      const compatible =
        sources.filter(
          x =>
            !primary.cc ||
            !x.cc ||
            x.cc === primary.cc
        );


      const first =
        key => {

          for (
            const x of compatible
          ) {

            if (x[key])
              return x[key];

          }

          return "";
        };


      /*
       * ASN + ISP 尽量同源。
       */

      let asn = "";
      let org = "";


      for (
        const x of compatible
      ) {

        if (x.asn) {

          asn =
            x.asn;

          org =
            x.org || "";

          break;
        }

      }


      /*
       * 当前 ASN 来源没有 ISP 时，
       * 只从同 ASN 来源补充。
       */

      if (
        asn &&
        !org
      ) {

        const same =
          compatible.find(
            x =>
              x.asn === asn &&
              x.org
          );


        if (same)
          org = same.org;

      }


      const score =
        getScore(
          c.risk,
          q
        );


      const country =
        first(
          "country"
        );


      const city =
        first(
          "city"
        );


      return {
        ip,

        cc:
          first("cc"),

        flag:
          flag(
            first("cc")
          ),

        location:
          [
            country,
            city
          ]
            .filter(
              (x, i, arr) =>
                x &&
                arr.indexOf(x) === i
            )
            .join(" · ")
          ||
          "未知",

        asn:
          asn || "—",

        org:
          org || "—",

        score,

        scoreText:
          score == null
            ? "—"
            : score +
              " · " +
              scoreName(score),

        type:
          getType(
            c.risk,
            q,
            a
          )
      };

    })();


  return CACHE[ip];
}


/* =========================================================
 * Status
 * ========================================================= */

function status(
  service,
  probe,
  p,
  sentCN = false
) {
  const r =
    probe.res;


  if (
    !r.status
  ) {
    return r.timeout

      ? [
          "timeout",
          "🚦",
          "检测超时"
        ]

      : [
          "block",
          "🚫",
          "无法访问"
        ];
  }


  if (
    service === "gemini" &&
    sentCN
  ) {
    return [
      "warn",
      "❗️",
      "送中 IP"
    ];
  }


  const cc =
    String(
      p && (
        p.region ||
        p.cc
      )
      ||
      ""
    )
      .toUpperCase();


  if (
    BLOCKED[service] &&
    BLOCKED[service].includes(cc)
  ) {
    return [
      "block",
      "🚫",
      cc +
      " 地区不支持"
    ];
  }


  if (
    r.status >= 200 &&
    r.status < 400
  ) {
    return [
      "ok",
      "🎉",
      "探针可达"
    ];
  }


  if (
    r.status === 429
  ) {
    return [
      "warn",
      "❗️",
      "限流"
    ];
  }


  if (
    r.status === 403
  ) {
    const text =
      String(
        r.body || ""
      )
        .toLowerCase();


    return [
      "warn",
      "❗️",

      /cf-chl|challenge-platform|just a moment|captcha/
        .test(text)

        ? "Challenge"

        : "HTTP 403"
    ];
  }


  return [
    "warn",
    "❗️",
    "HTTP " +
    r.status
  ];
}


/* =========================================================
 * UI
 * ========================================================= */

function row(
  label,
  value
) {
  return `

<div class="row">

  <span class="key">
    ${esc(label)}
  </span>

  <span class="val">
    ${esc(value)}
  </span>

</div>

`;
}


function render(item) {
  const p =
    item.profile || {};


  const s =
    item.status;


  /*
   * UI 层压缩：
   *
   * HK 地区不支持
   * ->
   * HK 未支持
   */

  const statusText =
    /^([A-Z]{2}) 地区不支持$/
      .test(s[2])

      ? s[2]
          .replace(
            " 地区不支持",
            " 未支持"
          )

      : s[2];


  return `

<div class="service">


  <table class="head">

    <tr>

      <td>
        ${esc(
          item.name
        )}
      </td>

      <td>
        ${esc(
          item.latency == null
            ? "—"
            : item.latency +
              " ms"
        )}
      </td>

      <td>

        <span class="state ${s[0]}">

          ${s[1]}
          ${esc(
            statusText
          )}

        </span>

      </td>

    </tr>

  </table>


  ${row(

    "IP：",

    (
      p.flag ||
      "🌐"
    )
    +
    " "
    +
    (
      p.exact === false
        ? "≈ "
        : ""
    )
    +
    (
      p.ip ||
      "获取失败"
    )

  )}


  ${row(

    "评分：",

    p.scoreText ||
    "—"

  )}


  ${row(

    "位置：",

    p.location ||
    "未知"

  )}


  ${row(

    "ASN：",

    [
      p.asn,
      p.org
    ]

      .filter(
        x =>
          x &&
          x !== "—"
      )

      .join(" · ")

    ||

    "—"

  )}


  ${row(

    "类型：",

    p.type ||
    "未知"

  )}


</div>

`;

}


/* =========================================================
 * HTML
 * ========================================================= */

function page(
  items,
  elapsed
) {
  return `

<style>


* {
  box-sizing:
    border-box;
}


html,
body {
  margin:
    0;

  padding:
    0;
}


body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Text",
    "Helvetica Neue",
    sans-serif;

  color:
    -apple-system-label;

  -webkit-text-size-adjust:
    100%;
}


.wrap {
  max-height:
    64vh;

  overflow-y:
    auto;

  padding:
    2px 10px 5px;

  font-size:
    12.4px;

  line-height:
    1.32;
}


/* =========================================================
 * Separator
 * ========================================================= */

.line {
  overflow:
    hidden;

  white-space:
    nowrap;

  text-align:
    center;

  margin:
    0 0 11px;

  font-family:
    "SF Mono",
    Menlo,
    monospace;

  font-size:
    11px;

  opacity:
    .58;
}


/* =========================================================
 * Service
 * ========================================================= */

.service {
  width:
    100%;
}


/*
 * 服务之间加入明确空行。
 */

.serviceGap {
  height:
    12px;

  line-height:
    12px;

  font-size:
    8px;
}


/* =========================================================
 * Header
 * ========================================================= */

.head {
  width:
    100%;

  table-layout:
    fixed;

  border-collapse:
    collapse;

  margin:
    0 0 6px;
}


.head td {
  width:
    33.333%;

  padding:
    0;

  border:
    0;

  white-space:
    nowrap;

  vertical-align:
    middle;

  font-size:
    13px;

  font-weight:
    700;
}


.head td:nth-child(1) {
  text-align:
    left;
}


.head td:nth-child(2) {
  text-align:
    center;
}


.head td:nth-child(3) {
  text-align:
    right;

  font-size:
    11.4px;
}


/* =========================================================
 * Status
 * ========================================================= */

.state {
  display:
    inline-block;

  white-space:
    nowrap;

  word-break:
    keep-all;
}


.state.ok {
  color:
    #30d158;
}


.state.warn {
  color:
    #ffd36a;
}


.state.block {
  color:
    #ff5e57;
}


.state.timeout {
  color:
    #64d2ff;
}


/* =========================================================
 * Info Rows
 * ========================================================= */

.row {
  display:
    block;

  width:
    100%;

  margin-top:
    2px;

  white-space:
    normal;
}


/*
 * v2.6.2
 *
 * IP：
 * 评分：
 * 位置：
 * ASN：
 * 类型：
 *
 * 固定灰白色。
 *
 * 不再使用 opacity 制造灰度，
 * 避免 QX 毛玻璃合成后层级不明显。
 */

.key {
  display:
    inline-block;

  width:
    46px;

  padding-right:
    5px;

  vertical-align:
    top;

  text-align:
    right;

  white-space:
    nowrap;

  color:
    #98989f !important;

  opacity:
    1 !important;

  font-size:
    12px;

  font-weight:
    650;
}


/*
 * 数据值保持系统正文颜色。
 */

.val {
  display:
    inline;

  color:
    inherit;

  opacity:
    .98;

  font-weight:
    400;

  overflow-wrap:
    anywhere;
}


/* =========================================================
 * Bottom
 * ========================================================= */

.bottom {
  margin-top:
    12px;

  margin-bottom:
    8px;
}


.node {
  text-align:
    center;

  white-space:
    nowrap;

  overflow:
    hidden;

  text-overflow:
    ellipsis;

  font-size:
    12.7px;

  font-weight:
    650;
}


.time {
  margin-top:
    4px;

  text-align:
    center;

  font-size:
    10.5px;

  opacity:
    .58;
}


</style>


<div class="wrap">


  <div class="line">

    ------------------------------------------

  </div>


  ${items
    .map(render)
    .join(
      '<div class="serviceGap"><br></div>'
    )
  }


  <div class="line bottom">

    ------------------------------------------

  </div>


  <div class="node">

    节点 ➟
    ${esc(
      POLICY ||
      "当前分流规则"
    )}

  </div>


  <div class="time">

    查询耗时：
    ${elapsed}
    ms

  </div>


</div>

`;
}


/* =========================================================
 * Main
 * ========================================================= */

async function main() {
  const begin =
    Date.now();


  /*
   * 第一阶段全部并发：
   *
   * ChatGPT
   * Claude
   * Gemini
   * 节点出口
   * Google 出口
   */

  const [
    chatProbe,
    claudeProbe,
    geminiProbe,
    nodeIP,
    gIP
  ] =
    await Promise.all([

      timed(
        "https://chatgpt.com/cdn-cgi/trace"
      ),

      timed(
        "https://claude.ai/cdn-cgi/trace"
      ),

      timed(
        "https://gemini.google.com/robots.txt"
      ),

      getNodeIP(),

      getGoogleIP()

    ]);


  const chatTrace =
    trace(
      chatProbe.res.body
    );


  const claudeTrace =
    trace(
      claudeProbe.res.body
    );


  const chatTraceIP =
    normalizeIP(
      chatTrace.ip
    );


  const claudeTraceIP =
    normalizeIP(
      claudeTrace.ip
    );


  const chatIP =
    chatTraceIP ||
    nodeIP;


  const claudeIP =
    claudeTraceIP ||
    nodeIP;


  const directGoogle =
    googleIP(
      geminiProbe.res.body
    );


  const geminiIP =
    directGoogle ||
    gIP ||
    nodeIP;


  /*
   * 所有唯一 IP 一次性查询。
   */

  const ips =
    Array.from(
      new Set(
        [
          chatIP,
          claudeIP,
          geminiIP,
          nodeIP
        ]
          .filter(Boolean)
      )
    );


  await Promise.all(
    ips.map(profile)
  );


  const chat =
    chatIP

      ? Object.assign(
          {},
          await profile(
            chatIP
          ),
          {
            region:
              chatTrace.loc ||
              "",

            exact:
              !!chatTraceIP
          }
        )

      : null;


  const claude =
    claudeIP

      ? Object.assign(
          {},
          await profile(
            claudeIP
          ),
          {
            region:
              claudeTrace.loc ||
              "",

            exact:
              !!claudeTraceIP
          }
        )

      : null;


  const gemini =
    geminiIP

      ? Object.assign(
          {},
          await profile(
            geminiIP
          ),
          {
            exact:
              !!directGoogle
          }
        )

      : null;


  const node =
    nodeIP
      ? await profile(
          nodeIP
        )
      : null;


  /*
   * Gemini 送中：
   *
   * Google 出口 = CN
   * 节点自身 != CN
   */

  const sentCN =
    !!(
      gemini &&
      gemini.cc === "CN" &&
      node &&
      node.cc &&
      node.cc !== "CN"
    );


  const items = [

    {
      name:
        "ChatGPT",

      profile:
        chat,

      latency:
        chatProbe.res.status
          ? chatProbe.latency
          : null,

      status:
        status(
          "chatgpt",
          chatProbe,
          chat
        )
    },


    {
      name:
        "Claude",

      profile:
        claude,

      latency:
        claudeProbe.res.status
          ? claudeProbe.latency
          : null,

      status:
        status(
          "claude",
          claudeProbe,
          claude
        )
    },


    {
      name:
        "Gemini",

      profile:
        gemini,

      latency:
        geminiProbe.res.status
          ? geminiProbe.latency
          : null,

      status:
        status(
          "gemini",
          geminiProbe,
          gemini,
          sentCN
        )
    }

  ];


  $done({
    title:
      "AI 节点检测",

    htmlMessage:
      page(
        items,
        Date.now() - begin
      )
  });
}


/* =========================================================
 * Start
 * ========================================================= */

main()

  .catch(err => {

    $done({

      title:
        "AI 节点检测",

      htmlMessage:
        `

<div style="
  padding:12px;
  text-align:center;
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  color:-apple-system-label;
">

  <b>
    ❗️ 检测失败
  </b>

  <br>

  <small style="opacity:.65">

    ${esc(
      err &&
      (
        err.message ||
        err
      )
      ||
      "未知错误"
    )}

  </small>

</div>

`

    });

  });
})({params: __loonNode, executor: "event-interaction"}, __loonTask, __loonPrefs, __loonDone, __loonSetTimeout, __loonClearTimeout);
