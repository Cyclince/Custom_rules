// 节点解锁查询脚本，制作 by 翀𝙡𝙧 TG：https://t.me/chong_redaily
// 更新时间：2026-11-07
// 功能简介：并发检查流媒体、AI、Reddit 与 Cloudflare 的访问状态、地区信息及限制信号。

/**
 * Quantumult X - Streaming / AI / Cloudflare Check
 * Version: 1.5
 *
 * Status:
 * 🎉 = 正常
 * ❗️ = 异常 / 部分可用 / Challenge / 限流 / 服务异常
 * 🚫 = 无法访问 / 未支持 / 明确封控
 * 🚦 = 检测超时
 *
 * Order:
 * TikTok
 * Netflix
 * Disney+
 * Amazon PV
 * Spotify
 * ChatGPT
 * Claude
 * Reddit
 * YouTube Premium
 * Cloudflare
 *
 * Quantumult X 598+
 * event-interaction
 */

const VERSION = "1.5";

const POLICY =
  typeof $environment !== "undefined" &&
  $environment.params
    ? $environment.params
    : "";

const TIMEOUT = 7000;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/125.0.0.0 Safari/537.36";


/* ============================================================
 * Common
 * ============================================================ */

function qxOpts(redirection) {

  const o = {};

  if (POLICY) {
    o.policy = POLICY;
  }

  if (redirection === false) {
    o.redirection = false;
  }

  return o;
}


function statusCode(resp) {

  return resp
    ? Number(
        resp.statusCode ||
        resp.status ||
        0
      )
    : 0;
}


function responseBody(resp) {

  return (
    resp &&
    typeof resp.body === "string"
  )
    ? resp.body
    : "";
}


function getHeader(resp, name) {

  if (
    !resp ||
    !resp.headers
  ) {
    return "";
  }


  const wanted =
    String(name).toLowerCase();


  const keys =
    Object.keys(
      resp.headers
    );


  for (
    let i = 0;
    i < keys.length;
    i++
  ) {

    if (
      String(
        keys[i]
      ).toLowerCase() ===
      wanted
    ) {

      return String(
        resp.headers[
          keys[i]
        ]
      );
    }
  }


  return "";
}


async function fetchSafe(request) {

  const req =
    Object.assign(
      {
        timeout: TIMEOUT
      },
      request
    );


  if (!req.opts) {
    req.opts =
      qxOpts();
  }


  try {

    const resp =
      await $task.fetch(req);


    return {
      ok: true,
      resp: resp,
      error: ""
    };

  } catch (e) {

    return {
      ok: false,
      resp: null,
      error: String(e)
    };

  }
}


function makeResult(
  level,
  text,
  detail,
  note
) {

  return {

    level:
      level,

    text:
      text || "",

    detail:
      detail || "",

    note:
      note || ""

  };
}


/* ============================================================
 * Network
 * ============================================================ */

function networkErrorCode(error) {

  const text =
    String(
      error || ""
    );


  if (
    /timeout|timed out/i
      .test(text)
  ) {

    return "TIMEOUT";
  }


  if (
    /dns|resolve|host/i
      .test(text)
  ) {

    return "DNS";
  }


  if (
    /ssl|tls|certificate|cert/i
      .test(text)
  ) {

    return "TLS";
  }


  return "NETWORK";
}


function networkResult(error) {

  const type =
    networkErrorCode(
      error
    );


  if (
    type === "TIMEOUT"
  ) {

    return makeResult(
      "timeout",
      "检测超时"
    );
  }


  if (
    type === "DNS"
  ) {

    return makeResult(
      "no",
      "DNS 解析失败"
    );
  }


  if (
    type === "TLS"
  ) {

    return makeResult(
      "no",
      "TLS 连接失败"
    );
  }


  return makeResult(
    "no",
    "无法访问"
  );
}


/* ============================================================
 * Region
 * ============================================================ */

function normalizeRegion(value) {

  if (!value) {
    return "";
  }


  const cc =
    String(value)
      .trim()
      .toUpperCase();


  return /^[A-Z]{2}$/.test(cc)
    ? cc
    : "";
}


function flagEmoji(cc) {

  cc =
    normalizeRegion(cc);


  if (!cc) {
    return "";
  }


  try {

    return String.fromCodePoint(

      127397 +
      cc.charCodeAt(0),

      127397 +
      cc.charCodeAt(1)

    );

  } catch (_) {

    return "";

  }
}


function regionDisplay(cc) {

  cc =
    normalizeRegion(cc);


  if (!cc) {
    return "地区未知";
  }


  const flag =
    flagEmoji(cc);


  return (
    flag
      ? flag + " "
      : ""
  ) + cc;
}


/* ============================================================
 * Helpers
 * ============================================================ */

function parseTrace(text) {

  const out = {};


  String(
    text || ""
  )

    .split(
      /\r?\n/
    )

    .forEach(
      function(line) {

        const p =
          line.indexOf("=");


        if (p > 0) {

          out[
            line.slice(
              0,
              p
            )
          ] =
            line.slice(
              p + 1
            );
        }
      }
    );


  return out;
}


function escapeHTML(value) {

  return String(
    value == null
      ? ""
      : value
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    );
}


/* ============================================================
 * TikTok
 * ============================================================ */

function parseTikTokStoreRegion(text) {

  if (!text) {
    return "";
  }


  try {

    const data =
      JSON.parse(text);


    const region =
      data &&
      data.data &&
      data.data.store_region;


    if (region) {

      return normalizeRegion(
        region
      );
    }

  } catch (_) {}


  const match =
    String(text)
      .match(
        /"store_region"\s*:\s*"([A-Za-z]{2})"/i
      );


  return match
    ? normalizeRegion(
        match[1]
      )
    : "";
}


function parseTikTokPageRegion(html) {

  if (!html) {
    return "";
  }


  try {

    const match =
      html.match(
        /<script[^>]*id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i
      );


    if (
      match &&
      match[1]
    ) {

      const data =
        JSON.parse(
          match[1]
        );


      const scope =
        data &&
        data.__DEFAULT_SCOPE__;


      const context =
        scope &&
        scope[
          "webapp.app-context"
        ];


      if (context) {

        const region =
          normalizeRegion(

            context.region ||

            context.regionCode ||

            context.countryCode

          );


        if (region) {
          return region;
        }
      }
    }

  } catch (_) {}


  const patterns = [

    /"region"\s*:\s*"([A-Za-z]{2})"/,

    /\\"region\\"\s*:\s*\\"([A-Za-z]{2})\\"/,

    /"regionCode"\s*:\s*"([A-Za-z]{2})"/,

    /"countryCode"\s*:\s*"([A-Za-z]{2})"/

  ];


  for (
    let i = 0;
    i < patterns.length;
    i++
  ) {

    const match =
      html.match(
        patterns[i]
      );


    if (match) {

      const region =
        normalizeRegion(
          match[1]
        );


      if (region) {
        return region;
      }
    }
  }


  return "";
}


async function testTikTok() {

  const responses =
    await Promise.all([

      fetchSafe({

        url:
          "https://www.tiktok.com/passport/web/store_region/",

        method:
          "POST",

        opts:
          qxOpts(),

        timeout:
          7000,

        headers: {

          "User-Agent":
            UA,

          "Accept":
            "application/json, text/plain, */*",

          "Accept-Language":
            "en-US,en;q=0.9",

          "Content-Type":
            "application/x-www-form-urlencoded",

          "Origin":
            "https://www.tiktok.com",

          "Referer":
            "https://www.tiktok.com/"

        },

        body:
          ""

      }),


      fetchSafe({

        url:
          "https://www.tiktok.com/",

        method:
          "GET",

        opts:
          qxOpts(),

        timeout:
          7000,

        headers: {

          "User-Agent":
            UA,

          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "Accept-Language":
            "en-US,en;q=0.9",

          "Cache-Control":
            "no-cache",

          "Pragma":
            "no-cache"

        }

      })

    ]);


  const regionReq =
    responses[0];

  const homeReq =
    responses[1];


  if (regionReq.ok) {

    const region =
      parseTikTokStoreRegion(
        responseBody(
          regionReq.resp
        )
      );


    if (region) {

      if (
        region === "CN"
      ) {

        return makeResult(

          "no",

          "未支持 ➟ " +
          regionDisplay(region)

        );
      }


      return makeResult(

        "ok",

        "可用 ➟ " +
        regionDisplay(region)

      );
    }
  }


  if (homeReq.ok) {

    const code =
      statusCode(
        homeReq.resp
      );


    const body =
      responseBody(
        homeReq.resp
      );


    const region =
      parseTikTokPageRegion(
        body
      );


    if (region) {

      if (
        region === "CN"
      ) {

        return makeResult(

          "no",

          "未支持 ➟ " +
          regionDisplay(region)

        );
      }


      return makeResult(

        "ok",

        "可用 ➟ " +
        regionDisplay(region)

      );
    }


    if (
      code === 403
    ) {

      return makeResult(
        "warn",
        "HTTP 403 · 地区未知"
      );
    }


    if (
      code === 429
    ) {

      return makeResult(
        "warn",
        "HTTP 429 · 请求限流"
      );
    }


    if (
      code >= 200 &&
      code < 400
    ) {

      return makeResult(
        "warn",
        "可访问 · 地区未知"
      );
    }
  }


  if (
    !regionReq.ok &&
    !homeReq.ok
  ) {

    const e1 =
      networkErrorCode(
        regionReq.error
      );

    const e2 =
      networkErrorCode(
        homeReq.error
      );


    if (
      e1 === "TIMEOUT" &&
      e2 === "TIMEOUT"
    ) {

      return makeResult(
        "timeout",
        "检测超时"
      );
    }


    return networkResult(
      homeReq.error ||
      regionReq.error
    );
  }


  return makeResult(
    "no",
    "无法访问"
  );
}


/* ============================================================
 * Netflix
 * ============================================================ */

function netflixUnavailable(resp) {

  if (!resp) {
    return true;
  }


  const code =
    statusCode(resp);


  const body =
    responseBody(resp);


  return (

    code === 404 ||

    /Oh no!|not available|page not found/i
      .test(body)

  );
}


function netflixRegion(resp) {

  const header =
    getHeader(
      resp,
      "X-Originating-URL"
    );


  let match =
    header.match(
      /netflix\.com\/([a-z]{2})(?:-[a-z]{2})?\//i
    );


  if (match) {

    return normalizeRegion(
      match[1]
    );
  }


  const body =
    responseBody(resp);


  match =
    body.match(
      /"countryCode"\s*:\s*"([A-Za-z]{2})"/
    );


  if (match) {

    return normalizeRegion(
      match[1]
    );
  }


  match =
    body.match(
      /"requestCountry"\s*:\s*\{[^}]*"id"\s*:\s*"([A-Za-z]{2})"/i
    );


  if (match) {

    return normalizeRegion(
      match[1]
    );
  }


  match =
    body.match(
      /"id"\s*:\s*"([A-Za-z]{2})"\s*,\s*"countryName"/
    );


  return match
    ? normalizeRegion(
        match[1]
      )
    : "";
}


async function testNetflix() {

  const urls = [

    "https://www.netflix.com/title/81280792",

    "https://www.netflix.com/title/70143836"

  ];


  const probes =
    await Promise.all(

      urls.map(
        function(url) {

          return fetchSafe({

            url:
              url,

            method:
              "GET",

            opts:
              qxOpts(),

            timeout:
              7500,

            headers: {

              "User-Agent":
                UA,

              "Accept-Language":
                "en-US,en;q=0.9"

            }

          });

        }
      )

    );


  if (
    !probes[0].ok &&
    !probes[1].ok
  ) {

    const e1 =
      networkErrorCode(
        probes[0].error
      );

    const e2 =
      networkErrorCode(
        probes[1].error
      );


    if (
      e1 === "TIMEOUT" &&
      e2 === "TIMEOUT"
    ) {

      return makeResult(
        "timeout",
        "检测超时"
      );
    }


    return networkResult(
      probes[0].error ||
      probes[1].error
    );
  }


  let playable =
    false;

  let region =
    "";

  let blocked =
    false;


  for (
    let i = 0;
    i < probes.length;
    i++
  ) {

    if (!probes[i].ok) {
      continue;
    }


    const code =
      statusCode(
        probes[i].resp
      );


    const body =
      responseBody(
        probes[i].resp
      );


    if (
      code === 403
    ) {

      blocked =
        true;
    }


    if (
      code >= 200 &&
      code < 400 &&
      /og:video/i.test(body)
    ) {

      playable =
        true;
    }


    if (!region) {

      region =
        netflixRegion(
          probes[i].resp
        );
    }
  }


  if (playable) {

    return makeResult(

      "ok",

      "完整解锁" +

      (
        region
          ? " ➟ " +
            regionDisplay(region)
          : ""
      )

    );
  }


  if (

    netflixUnavailable(
      probes[0] &&
      probes[0].resp
    )

    &&

    netflixUnavailable(
      probes[1] &&
      probes[1].resp
    )

  ) {

    return makeResult(

      "warn",

      "仅自制剧" +

      (
        region
          ? " ➟ " +
            regionDisplay(region)
          : ""
      )

    );
  }


  if (blocked) {

    return makeResult(
      "no",
      "HTTP 403 · IP 受限"
    );
  }


  return makeResult(
    "no",
    "无法访问"
  );
}


/* ============================================================
 * Disney+
 * ============================================================ */

async function testDisneyPlus() {

  const auth =
    "ZGlzbmV5JmJyb3dzZXImMS4wLjA." +
    "Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84";


  const payload = {

    query:
      "mutation registerDevice($input: RegisterDeviceInput!){" +
      "registerDevice(registerDevice:$input){" +
      "grant{grantType assertion}" +
      "}" +
      "}",


    variables: {

      input: {

        applicationRuntime:
          "chrome",


        attributes: {

          browserName:
            "chrome",

          browserVersion:
            "125.0.0.0",

          manufacturer:
            "apple",

          model:
            null,

          operatingSystem:
            "macintosh",

          operatingSystemVersion:
            "10.15.7",

          osDeviceIds:
            []

        },


        deviceFamily:
          "browser",

        deviceLanguage:
          "en",

        deviceProfile:
          "macosx"

      }

    }

  };


  const request =
    await fetchSafe({

      url:
        "https://disney.api.edge.bamgrid.com/graph/v1/device/graphql",

      method:
        "POST",

      opts:
        qxOpts(),

      headers: {

        "Accept-Language":
          "en",

        "Authorization":
          auth,

        "Content-Type":
          "application/json",

        "User-Agent":
          UA

      },


      body:
        JSON.stringify(
          payload
        )

    });


  if (
    request.ok &&
    statusCode(
      request.resp
    ) === 403
  ) {

    return makeResult(
      "no",
      "HTTP 403 · IP 受限"
    );
  }


  if (
    request.ok &&
    statusCode(
      request.resp
    ) === 200
  ) {

    try {

      const json =
        JSON.parse(
          responseBody(
            request.resp
          )
        );


      const sdk =
        json &&
        json.extensions &&
        json.extensions.sdk;


      const session =
        sdk &&
        sdk.session;


      const region =
        normalizeRegion(

          session &&
          session.location &&
          session.location.countryCode

        );


      const supported =
        session &&
        session.inSupportedLocation;


      if (
        region &&
        (
          supported === true ||
          supported === "true"
        )
      ) {

        return makeResult(

          "ok",

          "可用 ➟ " +
          regionDisplay(region)

        );
      }


      if (
        region &&
        (
          supported === false ||
          supported === "false"
        )
      ) {

        return makeResult(

          "no",

          "未支持 ➟ " +
          regionDisplay(region)

        );
      }

    } catch (_) {}
  }


  const home =
    await fetchSafe({

      url:
        "https://www.disneyplus.com/",

      method:
        "GET",

      opts:
        qxOpts(),

      headers: {

        "User-Agent":
          UA,

        "Accept-Language":
          "en-US,en;q=0.9"

      }

    });


  if (!home.ok) {

    return networkResult(
      home.error ||
      request.error
    );
  }


  const body =
    responseBody(
      home.resp
    );


  if (
    /not available in your region|unavailable/i
      .test(body)
  ) {

    return makeResult(
      "no",
      "地区未支持"
    );
  }


  const code =
    statusCode(
      home.resp
    );


  if (
    code >= 200 &&
    code < 400
  ) {

    return makeResult(
      "warn",
      "主页可访问 · 地区未知"
    );
  }


  return makeResult(
    "no",
    "无法访问"
  );
}


/* ============================================================
 * Amazon Prime Video
 * ============================================================ */

async function testPrimeVideo() {

  const request =
    await fetchSafe({

      url:
        "https://www.primevideo.com/",

      method:
        "GET",

      opts:
        qxOpts(),

      headers: {

        "User-Agent":
          UA,

        "Accept-Language":
          "en-US,en;q=0.9"

      }

    });


  if (!request.ok) {

    return networkResult(
      request.error
    );
  }


  const code =
    statusCode(
      request.resp
    );


  const body =
    responseBody(
      request.resp
    );


  if (
    /"isServiceRestricted"\s*:\s*true/i
      .test(body)
  ) {

    return makeResult(
      "no",
      "地区未支持"
    );
  }


  const match =
    body.match(
      /"currentTerritory"\s*:\s*"([^"\\]+)"/i
    );


  if (match) {

    const region =
      normalizeRegion(
        match[1]
      );


    return makeResult(

      "ok",

      region
        ? "可用 ➟ " +
          regionDisplay(region)
        : "可用"

    );
  }


  if (
    code === 403
  ) {

    return makeResult(
      "no",
      "HTTP 403 · IP 受限"
    );
  }


  if (
    code === 429
  ) {

    return makeResult(
      "warn",
      "HTTP 429 · 请求限流"
    );
  }


  if (
    code >= 200 &&
    code < 400
  ) {

    return makeResult(
      "warn",
      "可访问 · 地区未知"
    );
  }


  return makeResult(
    "no",
    "无法访问"
  );
}


/* ============================================================
 * Spotify
 * ============================================================ */

function parseSpotifyRegion(html) {

  if (!html) {
    return "";
  }


  const patterns = [

    /"geoCountry"\s*:\s*"([A-Za-z]{2})"/i,

    /\\"geoCountry\\"\s*:\s*\\"([A-Za-z]{2})\\"/i,

    /geoCountry[^A-Za-z]+([A-Za-z]{2})[^A-Za-z]+geoCountryMarket/i

  ];


  for (
    let i = 0;
    i < patterns.length;
    i++
  ) {

    const match =
      html.match(
        patterns[i]
      );


    if (match) {

      const region =
        normalizeRegion(
          match[1]
        );


      if (region) {
        return region;
      }
    }
  }


  return "";
}


async function testSpotify() {

  const request =
    await fetchSafe({

      url:
        "https://www.spotify.com/tw/signup",

      method:
        "GET",

      opts:
        qxOpts(),

      timeout:
        7500,

      headers: {

        "User-Agent":
          UA,

        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

        "Accept-Language":
          "en-US,en;q=0.9"

      }

    });


  if (!request.ok) {

    return networkResult(
      request.error
    );
  }


  const code =
    statusCode(
      request.resp
    );


  const region =
    parseSpotifyRegion(

      responseBody(
        request.resp
      )

    );


  if (region) {

    return makeResult(

      "ok",

      "可用 ➟ " +
      regionDisplay(region)

    );
  }


  if (
    code === 403
  ) {

    return makeResult(
      "no",
      "HTTP 403 · IP 受限"
    );
  }


  if (
    code === 429
  ) {

    return makeResult(
      "warn",
      "HTTP 429 · 请求限流"
    );
  }


  if (
    code >= 200 &&
    code < 400
  ) {

    return makeResult(
      "warn",
      "可访问 · 地区未知"
    );
  }


  return makeResult(
    "no",
    "无法访问"
  );
}


/* ============================================================
 * ChatGPT
 * ============================================================ */

async function testChatGPT() {

  const responses =
    await Promise.all([

      fetchSafe({

        url:
          "https://api.openai.com/compliance/cookie_requirements",

        method:
          "GET",

        opts:
          qxOpts(),

        headers: {

          "User-Agent":
            UA,

          "Accept":
            "*/*",

          "Accept-Language":
            "en-US,en;q=0.9",

          "Authorization":
            "Bearer null",

          "Content-Type":
            "application/json",

          "Origin":
            "https://platform.openai.com",

          "Referer":
            "https://platform.openai.com/"

        }

      }),


      fetchSafe({

        url:
          "https://ios.chat.openai.com/",

        method:
          "GET",

        opts:
          qxOpts(),

        headers: {

          "User-Agent":
            UA,

          "Accept":
            "*/*",

          "Accept-Language":
            "en-US,en;q=0.9"

        }

      }),


      fetchSafe({

        url:
          "https://chatgpt.com/cdn-cgi/trace",

        method:
          "GET",

        opts:
          qxOpts(),

        headers: {

          "User-Agent":
            UA

        }

      })

    ]);


  const web =
    responses[0];

  const app =
    responses[1];

  const trace =
    responses[2];


  let region =
    "";


  if (trace.ok) {

    region =
      normalizeRegion(

        parseTrace(

          responseBody(
            trace.resp
          )

        ).loc

      );
  }


  const suffix =
    region
      ? " ➟ " +
        regionDisplay(region)
      : "";


  const webBlocked =
    web.ok &&
    /unsupported_country/i
      .test(
        responseBody(
          web.resp
        )
      );


  const appBlocked =
    app.ok &&
    /VPN|unsupported_country/i
      .test(
        responseBody(
          app.resp
        )
      );


  if (
    web.ok &&
    app.ok
  ) {

    if (
      !webBlocked &&
      !appBlocked
    ) {

      return makeResult(
        "ok",
        "完整支持" +
        suffix
      );
    }


    if (
      !webBlocked &&
      appBlocked
    ) {

      return makeResult(
        "warn",
        "Web 可用 / App 风控" +
        suffix
      );
    }


    if (
      webBlocked &&
      !appBlocked
    ) {

      return makeResult(
        "warn",
        "App 可用 / Web 未支持" +
        suffix
      );
    }


    return makeResult(
      "no",
      "地区未支持 / IP 受限" +
      suffix
    );
  }


  const errors =
    [
      web,
      app,
      trace
    ]
      .filter(
        function(x) {
          return !x.ok;
        }
      )
      .map(
        function(x) {
          return networkErrorCode(
            x.error
          );
        }
      );


  if (
    errors.length &&
    errors.every(
      function(x) {
        return x === "TIMEOUT";
      }
    )
  ) {

    return makeResult(
      "timeout",
      "检测超时"
    );
  }


  if (
    trace.ok &&
    region
  ) {

    return makeResult(
      "warn",
      "仅地区检测 ➟ " +
      regionDisplay(region)
    );
  }


  return makeResult(
    "no",
    "无法访问"
  );
}


/* ============================================================
 * Claude
 * ============================================================ */

function claudeUnavailable(
  code,
  location,
  body
) {

  const value =
    String(
      location || ""
    ) +
    "\n" +
    String(
      body || ""
    );


  return (

    /app-unavailable-in-region/i
      .test(value)

    ||

    /unavailable.*region/i
      .test(value)

    ||

    /only available in certain regions/i
      .test(value)

    ||

    code === 451

  );
}


async function testClaude() {

  const responses =
    await Promise.all([

      fetchSafe({

        url:
          "https://claude.ai/",

        method:
          "GET",

        opts:
          qxOpts(false),

        timeout:
          7500,

        headers: {

          "User-Agent":
            UA,

          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "Accept-Language":
            "en-US,en;q=0.9"

        }

      }),


      fetchSafe({

        url:
          "https://claude.ai/cdn-cgi/trace",

        method:
          "GET",

        opts:
          qxOpts(),

        headers: {

          "User-Agent":
            UA

        }

      })

    ]);


  const page =
    responses[0];

  const trace =
    responses[1];


  let region =
    "";


  if (trace.ok) {

    region =
      normalizeRegion(

        parseTrace(

          responseBody(
            trace.resp
          )

        ).loc

      );
  }


  const suffix =
    region
      ? " ➟ " +
        regionDisplay(region)
      : "";


  if (!page.ok) {

    return networkResult(
      page.error
    );
  }


  const code =
    statusCode(
      page.resp
    );


  const body =
    responseBody(
      page.resp
    );


  const location =
    getHeader(
      page.resp,
      "Location"
    );


  if (
    claudeUnavailable(
      code,
      location,
      body
    )
  ) {

    return makeResult(
      "no",
      "地区未支持" +
      suffix
    );
  }


  const mitigated =
    getHeader(
      page.resp,
      "cf-mitigated"
    ).toLowerCase();


  if (
    mitigated ===
    "challenge"
  ) {

    return makeResult(
      "warn",
      "触发 Challenge" +
      suffix
    );
  }


  if (
    code === 403
  ) {

    return makeResult(
      "no",
      "HTTP 403 · 访问受限" +
      suffix
    );
  }


  if (
    code === 429
  ) {

    return makeResult(
      "warn",
      "HTTP 429 · 请求限流" +
      suffix
    );
  }


  if (
    code >= 200 &&
    code < 400 &&
    !/unavailable/i
      .test(location)
  ) {

    return makeResult(
      "ok",
      "可用" +
      suffix
    );
  }


  return makeResult(
    "no",
    "无法访问" +
    suffix
  );
}


/* ============================================================
 * Reddit
 * ============================================================ */

async function testReddit() {

  const request =
    await fetchSafe({

      url:
        "https://www.reddit.com/",

      method:
        "GET",

      opts:
        qxOpts(),

      headers: {

        "User-Agent":
          UA,

        "Accept-Language":
          "en-US,en;q=0.9"

      }

    });


  if (!request.ok) {

    return networkResult(
      request.error
    );
  }


  const code =
    statusCode(
      request.resp
    );


  if (
    code >= 200 &&
    code < 400
  ) {

    return makeResult(
      "ok",
      "可访问"
    );
  }


  if (
    code === 403
  ) {

    return makeResult(
      "no",
      "HTTP 403 · IP 被拒绝"
    );
  }


  if (
    code === 429
  ) {

    return makeResult(
      "warn",
      "HTTP 429 · IP 限流"
    );
  }


  return makeResult(
    "no",
    "HTTP " +
    code +
    " · 无法访问"
  );
}


/* ============================================================
 * YouTube Premium
 * ============================================================ */

async function testYouTubePremium() {

  const request =
    await fetchSafe({

      url:
        "https://www.youtube.com/premium",

      method:
        "GET",

      opts:
        qxOpts(),

      headers: {

        "User-Agent":
          UA,

        "Accept-Language":
          "en-US,en;q=0.9"

      }

    });


  if (!request.ok) {

    return networkResult(
      request.error
    );
  }


  const code =
    statusCode(
      request.resp
    );


  const body =
    responseBody(
      request.resp
    );


  if (
    code === 403
  ) {

    return makeResult(
      "no",
      "HTTP 403 · 无法访问"
    );
  }


  if (
    code === 429
  ) {

    return makeResult(
      "warn",
      "HTTP 429 · 请求限流"
    );
  }


  if (
    code !== 200
  ) {

    return makeResult(
      "no",
      "HTTP " +
      code +
      " · 无法访问"
    );
  }


  if (
    /Premium is not available in your country/i
      .test(body)
  ) {

    return makeResult(
      "no",
      "地区未支持"
    );
  }


  if (
    /www\.google\.cn/i
      .test(body)
  ) {

    return makeResult(
      "no",
      "地区未支持 ➟ " +
      regionDisplay("CN")
    );
  }


  let match =
    body.match(
      /"INNERTUBE_CONTEXT_GL"\s*:\s*"([A-Za-z]{2})"/
    );


  if (!match) {

    match =
      body.match(
        /"GL"\s*:\s*"([A-Za-z]{2})"/
      );
  }


  const region =
    match
      ? normalizeRegion(
          match[1]
        )
      : "";


  return makeResult(

    "ok",

    "可用" +

    (
      region
        ? " ➟ " +
          regionDisplay(region)
        : ""
    )

  );
}


/* ============================================================
 * Cloudflare
 *
 * Priority:
 *
 * BLOCK
 * >
 * CHALLENGE / RATE / SERVICE
 * >
 * UNAVAILABLE
 * >
 * TIMEOUT
 * >
 * NORMAL
 *
 * UI:
 *
 * Normal                🎉
 * Challenge / Rate      ❗️
 * Service anomaly       ❗️
 * Unable / blocked      🚫
 * Timeout               🚦
 * ============================================================ */

const CF_PROBES = [

  {
    name:
      "Cloudflare",

    url:
      "https://www.cloudflare.com/cdn-cgi/trace"
  },


  {
    name:
      "ChatGPT",

    url:
      "https://chatgpt.com/"
  },


  {
    name:
      "Claude",

    url:
      "https://claude.ai/"
  }

];


const CF_BLOCK_CODES = {

  "1006": true,
  "1007": true,
  "1008": true,
  "1009": true,

  "1010": true,
  "1011": true,
  "1012": true,

  "1020": true,

  "1106": true

};


const CF_RATE_CODES = {

  "1015": true

};


/* ============================================================
 * CF error parser
 * ============================================================ */

function cloudflareErrorCode(body) {

  const text =
    String(
      body || ""
    );


  let match =
    text.match(
      /Error\s*(?:code)?\s*[:#]?\s*(1[0-9]{3})/i
    );


  if (match) {
    return match[1];
  }


  match =
    text.match(
      /["']?error[_ -]?code["']?\s*[:=]\s*["']?(1[0-9]{3})/i
    );


  return match
    ? match[1]
    : "";
}


/* ============================================================
 * Strict Challenge
 * ============================================================ */

function strongChallengeHTML(resp) {

  const body =
    responseBody(resp);


  const code =
    statusCode(resp);


  const server =
    getHeader(
      resp,
      "server"
    ).toLowerCase();


  const ray =
    getHeader(
      resp,
      "cf-ray"
    );


  const contentType =
    getHeader(
      resp,
      "content-type"
    ).toLowerCase();


  const looksLikeCF =

    server.indexOf(
      "cloudflare"
    ) !== -1

    ||

    !!ray;


  const isHTML =

    !contentType

    ||

    contentType.indexOf(
      "text/html"
    ) !== -1;


  if (
    !looksLikeCF ||
    !isHTML
  ) {

    return false;
  }


  const titleChallenge =

    /<title>\s*Just a moment\.\.\.\s*<\/title>/i
      .test(body);


  const challengeData =

    /_cf_chl_opt/i
      .test(body)

    &&

    /cdn-cgi\/challenge-platform/i
      .test(body);


  if (
    !titleChallenge &&
    !challengeData
  ) {

    return false;
  }


  return (

    code === 200 ||

    code === 403 ||

    code === 429 ||

    code === 503

  );
}


/* ============================================================
 * CF inspect
 * ============================================================ */

function inspectCloudflare(resp) {

  const http =
    statusCode(resp);


  const body =
    responseBody(resp);


  const mitigated =
    getHeader(
      resp,
      "cf-mitigated"
    ).toLowerCase();


  const server =
    getHeader(
      resp,
      "server"
    ).toLowerCase();


  const ray =
    getHeader(
      resp,
      "cf-ray"
    );


  const errorType =
    getHeader(
      resp,
      "cf-error-type"
    );


  const retryAfter =
    getHeader(
      resp,
      "retry-after"
    );


  const cfCode =
    cloudflareErrorCode(
      body
    );


  /* Challenge */

  if (
    mitigated ===
    "challenge"
  ) {

    return {

      type:
        "challenge",

      http:
        http,

      code:
        cfCode,

      ray:
        ray,

      retryAfter:
        retryAfter

    };
  }


  if (
    /challenge|iuam/i
      .test(errorType)
  ) {

    return {

      type:
        "challenge",

      http:
        http,

      code:
        cfCode,

      ray:
        ray,

      retryAfter:
        retryAfter

    };
  }


  if (
    strongChallengeHTML(
      resp
    )
  ) {

    return {

      type:
        "challenge",

      http:
        http,

      code:
        cfCode,

      ray:
        ray,

      retryAfter:
        retryAfter

    };
  }


  /* Explicit 1xxx */

  if (cfCode) {

    if (
      CF_BLOCK_CODES[
        cfCode
      ]
    ) {

      return {

        type:
          "block",

        http:
          http,

        code:
          cfCode,

        ray:
          ray,

        retryAfter:
          retryAfter

      };
    }


    if (
      CF_RATE_CODES[
        cfCode
      ]
    ) {

      return {

        type:
          "rate",

        http:
          http,

        code:
          cfCode,

        ray:
          ray,

        retryAfter:
          retryAfter

      };
    }


    return {

      type:
        "service",

      http:
        http,

      code:
        cfCode,

      ray:
        ray,

      retryAfter:
        retryAfter

    };
  }


  /* Rate */

  if (
    http === 429 &&
    (
      server.indexOf(
        "cloudflare"
      ) !== -1 ||
      ray
    )
  ) {

    return {

      type:
        "rate",

      http:
        http,

      code:
        "",

      ray:
        ray,

      retryAfter:
        retryAfter

    };
  }


  /* Explicit access block */

  if (
    http === 403 &&
    (
      server.indexOf(
        "cloudflare"
      ) !== -1 ||
      ray
    )
  ) {

    return {

      type:
        "block",

      http:
        http,

      code:
        "",

      ray:
        ray,

      retryAfter:
        retryAfter

    };
  }


  /* Server / edge / origin error */

  if (
    http >= 500
  ) {

    return {

      type:
        "service",

      http:
        http,

      code:
        "",

      ray:
        ray,

      retryAfter:
        retryAfter

    };
  }


  /* Normal */

  if (
    http >= 200 &&
    http < 400
  ) {

    return {

      type:
        "normal",

      http:
        http,

      code:
        "",

      ray:
        ray,

      retryAfter:
        retryAfter

    };
  }


  /* Generic unavailable */

  return {

    type:
      "unavailable",

    http:
      http,

    code:
      "",

    ray:
      ray,

    retryAfter:
      retryAfter

  };
}


/* ============================================================
 * CF issue display
 * ============================================================ */

function cloudflareIssueText(
  name,
  inspected
) {

  if (
    inspected.type ===
    "timeout"
  ) {

    return (
      name +
      ": TIMEOUT"
    );
  }


  if (
    inspected.type ===
    "unavailable"
  ) {

    if (
      inspected.http
    ) {

      return (
        name +
        ": 无法访问 / HTTP " +
        inspected.http
      );
    }


    return (
      name +
      ": 无法访问"
    );
  }


  const parts = [];


  switch (
    inspected.type
  ) {

    case "block":

      parts.push(
        "封控"
      );

      break;


    case "challenge":

      parts.push(
        "需验证"
      );

      break;


    case "rate":

      parts.push(
        "限流"
      );

      break;


    case "service":

      parts.push(
        "服务异常"
      );

      break;

  }


  if (
    inspected.http
  ) {

    parts.push(
      "HTTP " +
      inspected.http
    );
  }


  if (
    inspected.code &&
    String(
      inspected.code
    ) !==
    String(
      inspected.http
    )
  ) {

    parts.push(
      "CF " +
      inspected.code
    );
  }


  return (

    name +

    ": " +

    parts.join(
      " / "
    )

  );
}


/* ============================================================
 * Cloudflare explanation
 * ============================================================ */

function cloudflareExplanation(type) {

  switch (type) {

    case "block":

      return (
        "检测到明确 Cloudflare 访问封控。" +
        "CF 1020 通常表示站点 WAF 或防火墙规则拒绝；" +
        "1006/1007/1008/1106 通常表示 IP 被站点策略封禁；" +
        "1009 表示国家或地区限制。该结果属于目标站点策略，" +
        "不代表 Cloudflare 对该 IP 实施全局封禁。"
      );


    case "challenge":

      return (
        "当前环境触发 Cloudflare 人机验证。" +
        "通常表示目标站点对当前 IP、请求特征或客户端环境要求额外验证，" +
        "访问部分 Cloudflare 站点时可能出现 Challenge 或 Turnstile。"
      );


    case "rate":

      return (
        "当前环境触发 Cloudflare 限流。" +
        "CF 1015 或 HTTP 429 通常表示请求频率达到目标站点限制，" +
        "通常属于临时状态，不等同于永久封禁。"
      );


    case "service":

      return (
        "检测到 Cloudflare、Edge 或源站服务异常。" +
        "此类情况通常涉及边缘网络、DNS、Tunnel 或源站，" +
        "不能直接判断为当前节点 IP 被封控。"
      );


    case "unavailable":

      return (
        "Cloudflare 探针无法正常访问。" +
        "当前结果属于连接失败或服务不可达，" +
        "无法据此确认是否存在 Cloudflare Challenge。"
      );


    case "timeout":

      return (
        "Cloudflare 探针检测超时。" +
        "本次请求未在规定时间内完成，因此无法确定实际风控状态。"
      );


    default:

      return "";

  }
}


/* ============================================================
 * Cloudflare main
 * ============================================================ */

async function testCloudflare() {

  const responses =
    await Promise.all(

      CF_PROBES.map(
        function(item) {

          return fetchSafe({

            url:
              item.url,

            method:
              "GET",

            opts:
              qxOpts(),

            timeout:
              7000,

            headers: {

              "User-Agent":
                UA,

              "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

              "Accept-Language":
                "en-US,en;q=0.9",

              "Cache-Control":
                "no-cache"

            }

          });

        }
      )

    );


  const issues =
    [];


  let hasBlock =
    false;


  let hasWarn =
    false;


  let hasUnavailable =
    false;


  let hasTimeout =
    false;


  let highestNoteType =
    "normal";


  for (
    let i = 0;
    i < responses.length;
    i++
  ) {

    const item =
      CF_PROBES[i];


    const probe =
      responses[i];


    let inspected;


    if (!probe.ok) {

      const net =
        networkErrorCode(
          probe.error
        );


      if (
        net === "TIMEOUT"
      ) {

        inspected = {

          type:
            "timeout",

          http:
            0,

          code:
            "TIMEOUT"

        };


        hasTimeout =
          true;


        if (
          highestNoteType ===
          "normal"
        ) {

          highestNoteType =
            "timeout";
        }

      } else {

        inspected = {

          type:
            "unavailable",

          http:
            0,

          code:
            net

        };


        hasUnavailable =
          true;


        if (
          highestNoteType ===
            "normal" ||
          highestNoteType ===
            "timeout"
        ) {

          highestNoteType =
            "unavailable";
        }

      }

    } else {

      inspected =
        inspectCloudflare(
          probe.resp
        );


      switch (
        inspected.type
      ) {

        case "block":

          hasBlock =
            true;

          highestNoteType =
            "block";

          break;


        case "challenge":

          hasWarn =
            true;

          if (
            highestNoteType !==
            "block"
          ) {

            highestNoteType =
              "challenge";
          }

          break;


        case "rate":

          hasWarn =
            true;

          if (
            highestNoteType !==
              "block" &&
            highestNoteType !==
              "challenge"
          ) {

            highestNoteType =
              "rate";
          }

          break;


        case "service":

          hasWarn =
            true;

          if (
            highestNoteType ===
              "normal" ||
            highestNoteType ===
              "timeout" ||
            highestNoteType ===
              "unavailable"
          ) {

            highestNoteType =
              "service";
          }

          break;


        case "unavailable":

          hasUnavailable =
            true;

          if (
            highestNoteType ===
              "normal" ||
            highestNoteType ===
              "timeout"
          ) {

            highestNoteType =
              "unavailable";
          }

          break;

      }

    }


    console.log(

      "Cloudflare " +

      item.name +

      " => " +

      inspected.type +

      (
        inspected.http
          ? " / HTTP " +
            inspected.http
          : ""
      ) +

      (
        inspected.code
          ? " / " +
            inspected.code
          : ""
      )

    );


    if (
      inspected.type !==
      "normal"
    ) {

      issues.push(

        cloudflareIssueText(
          item.name,
          inspected
        )

      );
    }
  }


  if (
    issues.length === 0
  ) {

    return makeResult(
      "ok",
      "环境正常",
      "",
      ""
    );
  }


  const detail =
    issues.join(
      "；"
    );


  const note =
    cloudflareExplanation(
      highestNoteType
    );


  /*
   * Priority:
   *
   * block 🚫
   * >
   * challenge/rate/service ❗️
   * >
   * unavailable 🚫
   * >
   * timeout 🚦
   */


  if (hasBlock) {

    return makeResult(
      "no",
      "",
      detail,
      note
    );
  }


  if (hasWarn) {

    return makeResult(
      "warn",
      "",
      detail,
      note
    );
  }


  if (hasUnavailable) {

    return makeResult(
      "no",
      "",
      detail,
      note
    );
  }


  if (hasTimeout) {

    return makeResult(
      "timeout",
      "",
      detail,
      note
    );
  }


  return makeResult(
    "warn",
    "",
    detail,
    note
  );
}


/* ============================================================
 * Quantumult X Policy Path
 * ============================================================ */

async function getPolicyPath() {

  if (!POLICY) {

    return "当前策略";
  }


  if (
    typeof $configuration ===
    "undefined"
  ) {

    return POLICY;
  }


  try {

    const resolve =
      await $configuration
        .sendMessage({

          action:
            "get_policy_state",

          content:
            POLICY

        });


    if (
      resolve &&
      !resolve.error &&
      resolve.ret &&
      resolve.ret[
        POLICY
      ] !== undefined
    ) {

      let path =
        JSON.stringify(
          resolve.ret[
            POLICY
          ]
        );


      if (path) {

        return path

          .replace(
            /\"|\[|\]/g,
            ""
          )

          .replace(
            /,/g,
            " ➟ "
          );

      }
    }

  } catch (_) {}


  return POLICY;
}


/* ============================================================
 * UI
 * ============================================================ */

function statusIcon(level) {

  switch (level) {

    case "ok":

      return "🎉";


    case "warn":

      return "❗️";


    case "timeout":

      return "🚦";


    case "no":

      return "🚫";


    default:

      return "❗️";
  }
}


/* ============================================================
 * Row
 * ============================================================ */

function renderRow(row) {

  let text =
    row.value.text ||
    "";


  /*
   * Cloudflare:
   * abnormal detail replaces generic text.
   */

  if (
    row.value.detail
  ) {

    if (
      row.name ===
      "Cloudflare"
    ) {

      text =
        row.value.detail;

    } else {

      text +=

        (
          text
            ? " · "
            : ""
        )

        +

        row.value.detail;

    }
  }


  const isCloudflare =
    row.name ===
    "Cloudflare";


  const resultFont =
    isCloudflare
      ? "11.8px"
      : "13px";


  return (

    "<tr>" +


      /* Name */

      "<td style=\"" +

        "width:33%;" +

        "padding:" +
          "7px 3px 7px 4px;" +

        "font-size:13.5px;" +

        "font-weight:600;" +

        "letter-spacing:-0.1px;" +

        "text-align:left;" +

        "vertical-align:middle;" +

        "white-space:nowrap;" +

      "\">" +

        escapeHTML(
          row.name
        ) +

      "</td>" +


      /* Result */

      "<td style=\"" +

        "width:59%;" +

        "padding:" +
          "7px 2px;" +

        "font-size:" +
          resultFont +
          ";" +

        "font-weight:500;" +

        "letter-spacing:-0.1px;" +

        "text-align:right;" +

        "vertical-align:middle;" +

        "white-space:nowrap;" +

        "overflow:hidden;" +

        "text-overflow:ellipsis;" +

      "\">" +

        escapeHTML(
          text
        ) +

      "</td>" +


      /* Status */

      "<td style=\"" +

        "width:8%;" +

        "padding:" +
          "7px 1px 7px 5px;" +

        "font-size:16px;" +

        "text-align:right;" +

        "vertical-align:middle;" +

        "white-space:nowrap;" +

      "\">" +

        statusIcon(
          row.value.level
        ) +

      "</td>" +


    "</tr>"

  );
}


/* ============================================================
 * Cloudflare Note
 * ============================================================ */

function findCloudflareNote(rows) {

  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    if (
      rows[i].name ===
      "Cloudflare"
    ) {

      return (
        rows[i].value.note ||
        ""
      );
    }
  }


  return "";
}


/* ============================================================
 * Render
 * ============================================================ */

function render(
  rows,
  policyPath
) {

  const table =
    rows
      .map(
        renderRow
      )
      .join("");


  const cfNote =
    findCloudflareNote(
      rows
    );


  const separator =

    "<div style=\"" +

      "height:16px;" +

      "line-height:16px;" +

      "font-size:11px;" +

      "font-weight:400;" +

      "letter-spacing:0.2px;" +

      "text-align:center;" +

      "white-space:nowrap;" +

      "overflow:hidden;" +

      "opacity:.46;" +

    "\">" +

      "------------------------------------------" +

    "</div>";


  /*
   * Only visible when Cloudflare
   * is abnormal.
   */

  const explanation =
    cfNote

      ? (

        "<div style=\"" +

          "margin:" +
            "7px 5px 1px;" +

          "padding:" +
            "7px 9px;" +

          "border-radius:8px;" +

          "background:" +
            "rgba(128,128,128,.08);" +

          "font-size:10.5px;" +

          "font-weight:400;" +

          "line-height:1.45;" +

          "text-align:left;" +

          "opacity:.66;" +

        "\">" +

          "<span style=\"" +

            "font-weight:600;" +

          "\">" +

            "Cloudflare 说明：" +

          "</span>" +

          escapeHTML(
            cfNote
          ) +

        "</div>"

      )

      : "";


  return (

    "<div style=\"" +

      "font-family:" +
        "-apple-system," +
        "BlinkMacSystemFont," +
        "'SF Pro Text'," +
        "'SF Pro Display'," +
        "'Helvetica Neue'," +
        "Arial," +
        "sans-serif;" +

      "padding:" +
        "0 5px 1px;" +

      "line-height:1.2;" +

    "\">" +


      separator +


      "<table style=\"" +

        "width:100%;" +

        "border-collapse:collapse;" +

        "border-spacing:0;" +

        "table-layout:fixed;" +

      "\">" +

        table +

      "</table>" +


      separator +


      "<div style=\"" +

        "padding:" +
          "3px 4px 2px;" +

        "font-size:13px;" +

        "font-weight:500;" +

        "line-height:1.35;" +

        "letter-spacing:-0.1px;" +

        "text-align:center;" +

        "white-space:nowrap;" +

        "overflow:hidden;" +

        "text-overflow:ellipsis;" +

      "\">" +

        "<span style=\"" +

          "font-weight:600;" +

        "\">" +

          "节点信息" +

        "</span>" +

        "&nbsp;➟&nbsp;" +

        escapeHTML(
          policyPath
        ) +

      "</div>" +


      explanation +


    "</div>"

  );
}


/* ============================================================
 * Main
 * ============================================================ */

(async function main() {

  const checks = [

    {
      name:
        "TikTok",

      run:
        testTikTok
    },


    {
      name:
        "Netflix",

      run:
        testNetflix
    },


    {
      name:
        "Disney+",

      run:
        testDisneyPlus
    },


    {
      name:
        "Amazon PV",

      run:
        testPrimeVideo
    },


    {
      name:
        "Spotify",

      run:
        testSpotify
    },


    {
      name:
        "ChatGPT",

      run:
        testChatGPT
    },


    {
      name:
        "Claude",

      run:
        testClaude
    },


    {
      name:
        "Reddit",

      run:
        testReddit
    },


    {
      name:
        "YouTube Premium",

      run:
        testYouTubePremium
    },


    {
      name:
        "Cloudflare",

      run:
        testCloudflare
    }

  ];


  const values =
    await Promise.all(

      checks.map(
        function(item) {

          return item.run()

            .catch(
              function(e) {

                console.log(

                  item.name +
                  " error: " +
                  String(e)

                );


                if (
                  networkErrorCode(
                    String(e)
                  ) ===
                  "TIMEOUT"
                ) {

                  return makeResult(
                    "timeout",
                    "检测超时"
                  );
                }


                return makeResult(
                  "no",
                  "检测失败"
                );

              }
            );

        }
      )

    );


  const rows =
    checks.map(

      function(
        item,
        index
      ) {

        return {

          name:
            item.name,

          value:
            values[
              index
            ]

        };

      }

    );


  const policyPath =
    await getPolicyPath();


  $done({

    title:
      "流媒体 / AI 解锁检测",

    htmlMessage:
      render(
        rows,
        policyPath
      )

  });

})()

.catch(
  function(e) {

    console.log(
      "Fatal: " +
      String(e)
    );


    $done({

      title:
        "流媒体 / AI 解锁检测",

      htmlMessage:

        "<div style=\"" +

          "font-family:-apple-system;" +
          "text-align:center;" +
          "padding:18px;" +

        "\">" +

          "<b>" +
            "脚本运行异常" +
          "</b>" +

          "<br><br>" +

          "<span style=\"" +

            "font-size:11px;" +
            "opacity:.6;" +

          "\">" +

            escapeHTML(
              String(e)
            ) +

          "</span>" +

        "</div>"

    });

  }
);
