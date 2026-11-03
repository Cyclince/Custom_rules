## Google 送中检测脚本，制作 by 翀𝙡𝙧 TG：https://t.me/chong_redaily
## 更新时间：2026-11-03
## 功能简介：分别探测 IPv4、IPv6 出口，结合 Google 与 YouTube Premium 返回信息检查送中信号。

/**
 * Google 送中检测 v0.5.1
 * Quantumult X
 *
 * ----------------------------------------------------------
 * 核心功能
 *
 * - IPv4 / IPv6 独立检测
 * - 判断 IPv4 Only / IPv6 Only / 双栈
 * - 判断 IPv4 / IPv6 优先访问
 * - IPv4 / IPv6 分别检查 Google 送中信号
 * - IPPure 获取默认出口 Geo / ASN
 * - YouTube Premium 作为核心 Google 地区判据
 * - Google CN / www.google.cn 作为强送中信号
 *
 * ----------------------------------------------------------
 * 判定原则
 *
 * 只有命中明确送中证据才显示：
 *
 * ❗️ IPv4送中
 * ❗️ IPv6送中
 * ❗️ 双栈送中
 *
 * 否则：
 *
 * 🎉 未发现送中
 *
 * 不再显示：
 *
 * 检测不完整
 * 无法独立判定
 *
 * ----------------------------------------------------------
 * UI
 *
 * ① 协议栈 + 优先访问
 *
 * ② IPv4
 *
 * ③ IPv6
 *
 * ④ 依据
 *
 * 四块之间固定空一行。
 *
 * ----------------------------------------------------------
 *
 * [task_local]
 * event-interaction Google-SendCN.js, tag=Google 送中检测, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/YouTube_Letter.png, enabled=true
 */


/* =========================================================
 * Version / Runtime
 * ========================================================= */

var VERSION = "0.5.1";

var START_TIME = Date.now();

var FINISHED = false;


/* =========================================================
 * Timeout
 *
 * 所有检测并行。
 *
 * 正常目标：
 * 1.3 ~ 2.5 秒
 * ========================================================= */

var T_IP = 1300;

var T_META = 1400;

var T_GOOGLE = 1600;

var T_IPPURE = 1800;

var T_MAPPING = 1800;

var T_YOUTUBE = 2400;

var GLOBAL_TIMEOUT = 3600;


/* =========================================================
 * Quantumult X Policy
 * ========================================================= */

var POLICY = "";

try {

  if (
    typeof $environment !== "undefined" &&
    $environment.params
  ) {

    POLICY =
      String(
        $environment.params
      );

  }

} catch (e) {

  POLICY = "";

}


/* =========================================================
 * User-Agent
 * ========================================================= */

var UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/141.0.0.0 Safari/537.36";


/* =========================================================
 * HTTP
 *
 * 使用 JS soft timeout，
 * 不等待 QX 默认 10 秒 HTTP timeout。
 * ========================================================= */

function fetchSoft(
  url,
  timeout,
  headers
) {

  return new Promise(
    function (resolve) {

      var finished = false;

      var start = Date.now();


      var h = {

        "User-Agent":
          UA,

        "Accept":
          "text/html,application/xhtml+xml,application/json,text/plain,*/*",

        "Accept-Language":
          "en-US,en;q=0.9",

        "Cache-Control":
          "no-cache",

        "Pragma":
          "no-cache"

      };


      if (headers) {

        for (
          var key in headers
        ) {

          h[key] =
            headers[key];

        }

      }


      var req = {

        url:
          url,

        method:
          "GET",

        headers:
          h

      };


      if (POLICY) {

        req.opts = {

          policy:
            POLICY

        };

      }


      var timer =
        setTimeout(

          function () {

            if (finished) {

              return;

            }


            finished = true;


            resolve({

              ok:
                false,

              status:
                0,

              body:
                "",

              latency:
                Date.now() - start,

              timeout:
                true,

              error:
                "timeout"

            });

          },

          timeout

        );


      $task
        .fetch(
          req
        )

        .then(

          function (res) {

            if (finished) {

              return;

            }


            finished = true;


            clearTimeout(
              timer
            );


            resolve({

              ok:
                true,

              status:
                Number(
                  res.statusCode ||
                  res.status ||
                  0
                ),

              body:
                res.body ||
                "",

              headers:
                res.headers ||
                {},

              latency:
                Date.now() - start,

              timeout:
                false,

              error:
                ""

            });

          },


          function (err) {

            if (finished) {

              return;

            }


            finished = true;


            clearTimeout(
              timer
            );


            resolve({

              ok:
                false,

              status:
                0,

              body:
                "",

              latency:
                Date.now() - start,

              timeout:
                false,

              error:
                String(
                  err ||
                  "request failed"
                )

            });

          }

        );

    }
  );

}


/* =========================================================
 * IP Helpers
 * ========================================================= */

function cleanIP(
  value
) {

  return String(
    value ||
    ""
  )

    .trim()

    .replace(
      /^\[/,
      ""
    )

    .replace(
      /\]$/,
      ""
    )

    .replace(
      /^"|"$/g,
      ""
    );

}


function isV4(
  ip
) {

  var s =
    cleanIP(
      ip
    );


  var m =
    s.match(

      /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

    );


  if (!m) {

    return false;

  }


  for (
    var i = 1;
    i <= 4;
    i++
  ) {

    var n =
      Number(
        m[i]
      );


    if (
      n < 0 ||
      n > 255
    ) {

      return false;

    }

  }


  return true;

}


function isV6(ip) {
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


function family(
  ip
) {

  if (
    isV4(
      ip
    )
  ) {

    return "v4";

  }


  if (
    isV6(
      ip
    )
  ) {

    return "v6";

  }


  return "";

}


/* =========================================================
 * Parse IP Response
 * ========================================================= */

function parseIP(
  body
) {

  var text =
    String(
      body ||
      ""
    )
      .trim();


  if (!text) {

    return "";

  }


  /*
   * JSON
   */

  try {

    if (
      text.charAt(0) === "{"
    ) {

      var data =
        JSON.parse(
          text
        );


      if (
        data &&
        data.ip
      ) {

        return cleanIP(
          data.ip
        );

      }

    }

  } catch (e) {}


  /*
   * Plain text
   */

  var first =
    cleanIP(

      text
        .split(
          /\s+/
        )[0]

    );


  if (
    isV4(
      first
    ) ||
    isV6(
      first
    )
  ) {

    return first;

  }


  return "";

}


/* =========================================================
 * IP Probe
 *
 * 两个数据源同时请求。
 * 谁先返回合法 IP 就使用谁。
 * ========================================================= */

function firstIP(
  wanted,
  sources
) {

  return new Promise(
    function (resolve) {

      var done = false;

      var completed = 0;


      function check(
        result
      ) {

        if (done) {

          return;

        }


        completed++;


        if (
          result &&
          result.ok && result.status >= 200 && result.status < 300
        ) {

          var ip =
            parseIP(
              result.body
            );


          var valid =

            wanted === "v4"

              ? isV4(
                  ip
                )

              : isV6(
                  ip
                );


          if (valid) {

            done = true;


            resolve(
              ip
            );


            return;

          }

        }


        if (
          completed >=
          sources.length
        ) {

          done = true;


          resolve(
            ""
          );

        }

      }


      for (
        var i = 0;
        i < sources.length;
        i++
      ) {

        fetchSoft(

          sources[i],

          T_IP,

          {
            "Accept":
              "application/json,text/plain,*/*"
          }

        )
        .then(
          check
        );

      }

    }
  );

}


/* =========================================================
 * IPv4 / IPv6
 * ========================================================= */

function probeV4() {

  return firstIP(

    "v4",

    [

      "https://4.ipw.cn",

      "https://api.ipify.org?format=json"

    ]

  );

}


function probeV6() {

  return firstIP(

    "v6",

    [

      "https://6.ipw.cn",

      "https://api6.ipify.org?format=json"

    ]

  );

}


/* =========================================================
 * Preferred Family
 * ========================================================= */

function probePreferred() {

  return fetchSoft(

    "https://test.ipw.cn",

    T_IP,

    {
      "Accept":
        "text/plain,*/*"
    }

  )

  .then(
    function (result) {

      if (
        !result.ok || result.status < 200 || result.status >= 300
      ) {

        return "";

      }


      return family(

        parseIP(
          result.body
        )

      );

    }
  );

}


/* =========================================================
 * Country Flag
 * ========================================================= */

function flag(
  cc
) {

  var map = {

    CN:"🇨🇳",
    HK:"🇭🇰",
    MO:"🇲🇴",
    TW:"🇹🇼",

    JP:"🇯🇵",
    KR:"🇰🇷",
    SG:"🇸🇬",

    US:"🇺🇸",
    GB:"🇬🇧",
    CA:"🇨🇦",
    AU:"🇦🇺",

    DE:"🇩🇪",
    FR:"🇫🇷",
    NL:"🇳🇱",
    CH:"🇨🇭",

    MY:"🇲🇾",
    TH:"🇹🇭",
    VN:"🇻🇳",
    PH:"🇵🇭",
    ID:"🇮🇩",

    IN:"🇮🇳",
    AE:"🇦🇪",

    TR:"🇹🇷",

    BR:"🇧🇷",
    MX:"🇲🇽"

  };


  return map[
    String(
      cc ||
      ""
    )
      .toUpperCase()
  ] || "🌐";

}


/* =========================================================
 * IPPure
 * ========================================================= */

function parsePure(
  body
) {

  try {

    var data =
      JSON.parse(
        body ||
        "{}"
      );


    if (
      !data ||
      !data.ip
    ) {

      return null;

    }


    var cc =
      String(
        data.countryCode ||
        data.country_code ||
        ""
      )
        .toUpperCase();


    var asn =
      data.asn;


    if (
      asn !== undefined &&
      asn !== null &&
      asn !== ""
    ) {

      asn =
        "AS" +
        String(
          asn
        )
          .replace(
            /^AS/i,
            ""
          );

    }

    else {

      asn =
        "ASN 未知";

    }


    var location =
      [];


    if (
      data.country
    ) {

      location.push(
        String(
          data.country
        )
      );

    }


    if (
      data.region &&
      data.region !==
        data.country
    ) {

      location.push(
        String(
          data.region
        )
      );

    }


    if (
      data.city &&
      data.city !==
        data.region &&
      data.city !==
        data.country
    ) {

      location.push(
        String(
          data.city
        )
      );

    }


    return {

      ip:
        cleanIP(
          data.ip
        ),

      countryCode:
        cc,

      flag:
        flag(
          cc
        ),

      location:

        location.length

          ? location.join(
              " · "
            )

          : (
              cc ||
              "未知"
            ),

      asn:
        asn,

      org:
        String(

          data.asOrganization ||

          data.organization ||

          data.org ||

          data.isp ||

          "ISP 未知"

        )

    };


  } catch (e) {

    return null;

  }

}


/* =========================================================
 * Explicit IP Metadata
 * ========================================================= */

function queryMeta(
  ip
) {

  if (!ip) {

    return Promise.resolve(
      null
    );

  }


  return fetchSoft(

    "https://ipwho.is/" +
    encodeURIComponent(
      ip
    ),

    T_META,

    {
      "Accept":
        "application/json"
    }

  )

  .then(
    function (result) {

      if (
        !result.ok
      ) {

        return null;

      }


      try {

        var data =
          JSON.parse(
            result.body ||
            "{}"
          );


        if (
          !data ||
          data.success === false
        ) {

          return null;

        }


        var connection =
          data.connection ||
          {};


        var cc =
          String(
            data.country_code ||
            ""
          )
            .toUpperCase();


        var location =
          [];


        if (
          data.country
        ) {

          location.push(
            String(
              data.country
            )
          );

        }


        if (
          data.region &&
          data.region !==
            data.country
        ) {

          location.push(
            String(
              data.region
            )
          );

        }


        if (
          data.city &&
          data.city !==
            data.region &&
          data.city !==
            data.country
        ) {

          location.push(
            String(
              data.city
            )
          );

        }


        var asn =
          connection.asn;


        if (
          asn !== undefined &&
          asn !== null &&
          asn !== ""
        ) {

          asn =
            "AS" +
            String(
              asn
            )
              .replace(
                /^AS/i,
                ""
              );

        }

        else {

          asn =
            "ASN 未知";

        }


        return {

          ip:
            ip,

          countryCode:
            cc,

          flag:
            flag(
              cc
            ),

          location:

            location.length

              ? location.join(
                  " · "
                )

              : (
                  cc ||
                  "未知"
                ),

          asn:
            asn,

          org:
            String(

              connection.org ||

              connection.isp ||

              "ISP 未知"

            )

        };


      } catch (e) {

        return null;

      }

    }
  );

}


/* =========================================================
 * YouTube Premium Supported Regions
 * ========================================================= */

var PREMIUM =

  "|DZ|AS|AR|AW|AU|AT|AZ|" +
  "BH|BD|BY|BE|BM|BO|BA|BR|BG|" +
  "KH|CA|KY|CL|CO|CR|HR|CY|CZ|" +
  "DK|DO|EC|EG|SV|EE|" +
  "FI|FR|GF|PF|" +
  "GE|DE|GH|GR|GP|GU|GT|" +
  "HN|HK|HU|" +
  "IS|IN|ID|IQ|IE|IL|IT|" +
  "JM|JP|JO|" +
  "KZ|KE|KW|" +
  "LA|LV|LB|LY|LI|LT|LU|" +
  "MY|MT|MX|MA|" +
  "NP|NL|NZ|NI|NG|MK|MP|NO|" +
  "OM|PK|PA|PG|PY|PE|PH|PL|PT|PR|" +
  "QA|RE|RO|SA|SN|RS|SG|SK|SI|" +
  "ZA|KR|ES|LK|SE|CH|" +
  "TW|TZ|TH|TN|TR|TC|" +
  "UG|UA|AE|GB|US|VI|UY|" +
  "VE|VN|YE|ZW|";


function premiumSupported(
  cc
) {

  cc =
    String(
      cc ||
      ""
    )
      .toUpperCase();


  return (

    !!cc &&

    PREMIUM.indexOf(

      "|" +
      cc +
      "|"

    ) !== -1

  );

}


/* =========================================================
 * YouTube Premium
 * ========================================================= */

function parseYoutube(
  result
) {

  var out = {

    ok:
      false,

    unavailable:
      false,

    cn:
      false,

    region:
      ""

  };


  if (
    !result ||
    !result.ok ||
    result.status !== 200
  ) {

    return out;

  }


  out.ok =
    true;


  var body =
    String(
      result.body ||
      ""
    );


  var lower =
    body.toLowerCase();


  /*
   * Premium unavailable 必须优先判断。
   */

  out.unavailable =

    lower.indexOf(
      "premium is not available in your country"
    ) !== -1 ||

    lower.indexOf(
      "youtube premium is not available in your country"
    ) !== -1 ||

    lower.indexOf(
      "premium is not available in your region"
    ) !== -1;


  /*
   * unavailable 页面里的 GL 不采信。
   */

  if (
    out.unavailable
  ) {

    out.cn =

      lower.indexOf(
        "www.google.cn"
      ) !== -1;


    return out;

  }


  var patterns = [

    /"countryCode"\s*:\s*"([A-Z]{2})"/i,

    /"contentRegion"\s*:\s*"([A-Z]{2})"/i,

    /"GL"\s*:\s*"([A-Z]{2})"/i,

    /\\"countryCode\\":\\"([A-Z]{2})\\"/,

    /\\"contentRegion\\":\\"([A-Z]{2})\\"/,

    /\\"GL\\":\\"([A-Z]{2})\\"/

  ];


  for (
    var i = 0;
    i < patterns.length;
    i++
  ) {

    var match =
      patterns[i]
        .exec(
          body
        );


    if (
      match &&
      match[1]
    ) {

      out.region =
        String(
          match[1]
        )
          .toUpperCase();


      break;

    }

  }


  out.cn =

    out.region === "CN" ||

    lower.indexOf(
      "www.google.cn"
    ) !== -1;


  return out;

}


/* =========================================================
 * Google Family CN Probe
 *
 * 只检测强 CN 信号，
 * 不再等待不稳定的精确 Search Geo。
 * ========================================================= */

function probeGoogle(
  version
) {

  var host =

    version === "v4"

      ? "ipv4.google.com"

      : "ipv6.google.com";


  return fetchSoft(

    "https://" +
    host +
    "/search?q=google&hl=en&gbv=1&pws=0",

    T_GOOGLE,

    {
      "Accept":
        "text/html,*/*"
    }

  )

  .then(
    function (result) {

      if (
        !result ||
        !result.ok || result.status !== 200
      ) {

        return {

          cn:
            false,

          responded:
            false

        };

      }


      var body =
        String(
          result.body ||
          ""
        )
          .toLowerCase();


      return {

        cn:

          body.indexOf(
            "www.google.cn"
          ) !== -1,

        responded:
          true

      };

    }
  );

}


/* =========================================================
 * Google report_mapping
 * ========================================================= */

function parseMapping(
  result
) {

  if (
    !result ||
    !result.ok
  ) {

    return "";

  }


  var match =
    String(
      result.body ||
      ""
    )
      .match(

        /^\s*([0-9a-fA-F:.]+)\s*=>/

      );


  return (
    match &&
    match[1]
  )

    ? cleanIP(
        match[1]
      )

    : "";

}


/* =========================================================
 * Minimal Profile
 * ========================================================= */

function minimal(
  ip
) {

  return {

    ip:
      ip,

    countryCode:
      "",

    flag:
      "🌐",

    location:
      "未知",

    asn:
      "ASN 未知",

    org:
      "ISP 未知"

  };

}


/* =========================================================
 * Verdict
 *
 * 只有命中明确 evidence 才送中。
 * ========================================================= */

function verdict(
  version,
  item,
  youtube,
  youtubeFamily
) {

  if (
    !item ||
    !item.ip
  ) {

    return {

      sent:
        false,

      google:
        "",

      reason:
        ""

    };

  }


  var profile =
    item.profile ||
    minimal(
      item.ip
    );


  /*
   * Google family 页面明确 CN
   */

  if (
    item.google &&
    item.google.cn
  ) {

    return {

      sent:
        true,

      google:
        "🇨🇳 中国大陆 · Google CN",

      reason:

        version.toUpperCase() +

        " Google 命中 www.google.cn"

    };

  }


  /*
   * YouTube 只归属实际使用协议。
   */

  if (
    youtubeFamily ===
    version
  ) {

    /*
     * YouTube CN
     */

    if (
      youtube.cn
    ) {

      return {

        sent:
          true,

        google:
          "🇨🇳 中国大陆 · Google CN",

        reason:

          version.toUpperCase() +

          " YouTube 命中 Google CN"

      };

    }


    /*
     * 当前 IP 地区官方支持 Premium，
     * 但 YouTube 返回地区未支持。
     */

    if (
      youtube.unavailable &&
      premiumSupported(
        profile.countryCode
      )
    ) {

      return {

        sent:
          true,

        google:
          "🇨🇳 中国大陆倾向 · Premium 未支持",

        reason:

          version.toUpperCase() +

          " YT Premium 未支持（" +

          (
            profile.countryCode ||
            "当前地区"
          ) +

          " 应支持）"

      };

    }


    /*
     * Premium 正常
     */

    if (
      youtube.ok &&
      !youtube.unavailable &&
      youtube.region
    ) {

      return {

        sent:
          false,

        google:

          flag(
            youtube.region
          ) +

          " " +

          youtube.region +

          " · Premium 可用",

        reason:
          ""

      };

    }

  }


  /*
   * 没有明确送中证据。
   */

  return {

    sent:
      false,

    google:
      "🎉 未发现送中",

    reason:
      ""

  };

}


/* =========================================================
 * Escape HTML
 * ========================================================= */

function esc(
  value
) {

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


/* =========================================================
 * UI Row
 * ========================================================= */

function row(
  key,
  value,
  cls
) {

  return (

    '<div class="row ' +
    (
      cls ||
      ""
    ) +
    '">' +

      '<span class="key">' +

        esc(
          key
        ) +

      '：</span>' +

      '<span class="value">' +

        esc(
          value
        ) +

      '</span>' +

    '</div>'

  );

}


/* =========================================================
 * Family UI
 * ========================================================= */

function familyBlock(
  name,
  item,
  judge
) {

  /*
   * 协议不存在时仍保留这一块。
   */

  if (
    !item ||
    !item.ip
  ) {

    return (

      '<div class="contentBlock">' +

        row(
          name,
          "未检测到",
          "ip"
        ) +

      '</div>'

    );

  }


  var profile =
    item.profile ||
    minimal(
      item.ip
    );


  return (

    '<div class="contentBlock">' +


      row(

        name,

        (
          profile.flag ||
          "🌐"
        ) +

        " " +

        item.ip,

        "ip"

      ) +


      row(

        "位置",

        (
          profile.flag ||
          "🌐"
        ) +

        " " +

        profile.location

      ) +


      row(

        "ASN",

        profile.asn +

        " · " +

        profile.org

      ) +


      row(

        "Google",

        judge.google,

        "google"

      ) +


    '</div>'

  );

}


/* =========================================================
 * Render
 * ========================================================= */

function render(
  data
) {

  if (
    FINISHED
  ) {

    return;

  }


  FINISHED = true;


  var v4 =
    data.v4;


  var v6 =
    data.v6;


  var pure =
    data.pure;


  /* =========================================================
   * IPPure Fallback
   * ========================================================= */

  if (
    pure
  ) {

    var pureFamily =
      family(
        pure.ip
      );


    if (
      pureFamily === "v4"
    ) {

      if (
        !v4.ip
      ) {

        v4.ip =
          pure.ip;

      }


      if (
        v4.ip ===
        pure.ip
      ) {

        v4.profile =
          pure;

      }

    }


    else if (
      pureFamily === "v6"
    ) {

      if (
        !v6.ip
      ) {

        v6.ip =
          pure.ip;

      }


      if (
        v6.ip ===
        pure.ip
      ) {

        v6.profile =
          pure;

      }

    }

  }


  /* =========================================================
   * Mapping IP Fallback
   * ========================================================= */

  if (
    data.mapping
  ) {

    var mappingFamily =
      family(
        data.mapping
      );


    if (
      mappingFamily === "v4" &&
      !v4.ip
    ) {

      v4.ip =
        data.mapping;

    }


    if (
      mappingFamily === "v6" &&
      !v6.ip
    ) {

      v6.ip =
        data.mapping;

    }

  }


  /* =========================================================
   * Profile Fallback
   * ========================================================= */

  if (
    v4.ip &&
    !v4.profile
  ) {

    v4.profile =
      minimal(
        v4.ip
      );

  }


  if (
    v6.ip &&
    !v6.profile
  ) {

    v6.profile =
      minimal(
        v6.ip
      );

  }


  /* =========================================================
   * Protocol Stack
   * ========================================================= */

  var stack =
    "未知";


  if (
    v4.ip &&
    v6.ip
  ) {

    stack =
      "IPv4 + IPv6 双栈";

  }


  else if (
    v4.ip
  ) {

    stack =
      "IPv4 Only";

  }


  else if (
    v6.ip
  ) {

    stack =
      "IPv6 Only";

  }


  /* =========================================================
   * Preferred Family
   *
   * IPPure 默认出口优先。
   * ========================================================= */

  var preferred =
    "";


  if (
    pure
  ) {

    preferred =
      family(
        pure.ip
      );

  }


  if (
    !preferred
  ) {

    preferred =
      data.preferred;

  }


  if (
    !preferred
  ) {

    if (
      v4.ip &&
      !v6.ip
    ) {

      preferred =
        "v4";

    }


    else if (
      v6.ip &&
      !v4.ip
    ) {

      preferred =
        "v6";

    }

  }


  var preferredText =
    "未知";


  if (
    preferred === "v4"
  ) {

    preferredText =
      "IPv4 优先";

  }


  else if (
    preferred === "v6"
  ) {

    preferredText =
      "IPv6 优先";

  }


  /* =========================================================
   * YouTube Actual Family
   * ========================================================= */

  var youtubeFamily =
    family(
      data.mapping
    );


  if (
    !youtubeFamily
  ) {

    youtubeFamily =
      preferred;

  }


  /* =========================================================
   * Verdict
   * ========================================================= */

  var judge4 =
    verdict(

      "v4",

      v4,

      data.youtube,

      youtubeFamily

    );


  var judge6 =
    verdict(

      "v6",

      v6,

      data.youtube,

      youtubeFamily

    );


  /* =========================================================
   * Overall Status
   * ========================================================= */

  var statusClass =
    "ok";


  var statusIcon =
    "🎉";


  var statusText =
    "未发现送中";


  if (
    judge4.sent &&
    judge6.sent
  ) {

    statusClass =
      "bad";

    statusIcon =
      "❗️";

    statusText =
      "双栈送中";

  }


  else if (
    judge4.sent
  ) {

    statusClass =
      "bad";

    statusIcon =
      "❗️";

    statusText =
      "IPv4送中";

  }


  else if (
    judge6.sent
  ) {

    statusClass =
      "bad";

    statusIcon =
      "❗️";

    statusText =
      "IPv6送中";

  }


  if (!judge4.sent && !judge6.sent &&
      !(v4.google && v4.google.responded) &&
      !(v6.google && v6.google.responded) && !data.youtube.ok) {
    statusClass = "fail";
    statusIcon = "🚦";
    statusText = "Google 检测失败";
  }

  /*
   * 两种 IP 都拿不到，
   * 才真正属于网络检测失败。
   */

  if (
    !v4.ip &&
    !v6.ip
  ) {

    statusClass =
      "fail";

    statusIcon =
      "🚫";

    statusText =
      "网络检测失败";

  }


  /* =========================================================
   * Evidence
   * ========================================================= */

  var evidence =
    [];


  if (
    judge4.sent &&
    judge4.reason
  ) {

    evidence.push(
      judge4.reason
    );

  }


  if (
    judge6.sent &&
    judge6.reason
  ) {

    evidence.push(
      judge6.reason
    );

  }


  if (
    !evidence.length
  ) {

    evidence.push(
      "未命中 Google CN 或 Premium 异常信号"
    );

  }


  /* =========================================================
   * Elapsed
   * ========================================================= */

  var elapsed =
    Date.now() -
    START_TIME;


  /*
   * 使用真实字符分割线。
   *
   * 长度控制在 QX 弹窗内，
   * 避免自动换行。
   */

  var SEP =
    "----------------------------";


  /* =========================================================
   * HTML
   * ========================================================= */

  var html =

    '<html>' +

    '<head>' +

      '<meta name="viewport" ' +
      'content="width=device-width,initial-scale=1,maximum-scale=1">' +

      '<style>' +


      '*{' +

        'box-sizing:border-box;' +

      '}' +


      'body{' +

        'margin:0;' +

        'padding:4px 5px 3px;' +

        'background:transparent;' +

        'color:#FFFFFF;' +

        'font-family:' +

          '-apple-system,' +

          'BlinkMacSystemFont,' +

          '"SF Pro Text",' +

          '"PingFang SC",' +

          'sans-serif;' +

        'font-size:13px;' +

        'font-weight:500;' +

        'line-height:1.40;' +

      '}' +


      /* =====================================================
       * Separator
       * ===================================================== */

      '.sep{' +

        'margin:1px 0 6px;' +

        'color:#A7A7AD;' +

        'font-family:Menlo,Monaco,monospace;' +

        'font-size:10.8px;' +

        'letter-spacing:-0.7px;' +

        'text-align:center;' +

        'white-space:nowrap;' +

        'overflow:hidden;' +

      '}' +


      '.sep.bottom{' +

        'margin:0;' +

      '}' +


      /* =====================================================
       * Header
       * ===================================================== */

      '.header{' +

        'width:100%;' +

        'border-collapse:collapse;' +

        'table-layout:fixed;' +

        'margin:0;' +

      '}' +


      '.header td{' +

        'padding:0;' +

        'vertical-align:middle;' +

      '}' +


      '.title{' +

        'width:45%;' +

        'color:#FFFFFF;' +

        'font-size:15px;' +

        'font-weight:700;' +

        'text-align:left;' +

      '}' +


      '.status{' +

        'width:55%;' +

        'font-size:14px;' +

        'font-weight:700;' +

        'text-align:right;' +

        'white-space:nowrap;' +

      '}' +


      '.status.ok{' +

        'color:#79E29C;' +

      '}' +


      '.status.bad{' +

        'color:#FFD36A;' +

      '}' +


      '.status.fail{' +

        'color:#FF989F;' +

      '}' +


      /* =====================================================
       * 显式空行
       *
       * QX 中不要依赖 margin。
       * 使用固定高度 + nbsp。
       * ===================================================== */

      '.gap{' +

        'display:block;' +

        'height:13px;' +

        'min-height:13px;' +

        'line-height:13px;' +

        'font-size:1px;' +

        'overflow:hidden;' +

      '}' +


      '.gapSmall{' +

        'display:block;' +

        'height:7px;' +

        'min-height:7px;' +

        'line-height:7px;' +

        'font-size:1px;' +

        'overflow:hidden;' +

      '}' +


      /* =====================================================
       * Four Content Blocks
       * ===================================================== */

      '.contentBlock{' +

        'margin:0;' +

        'padding:0;' +

      '}' +


      '.row{' +

        'margin:1px 0;' +

        'font-size:13px;' +

        'line-height:1.40;' +

        'color:#FFFFFF;' +

        'word-break:break-word;' +

      '}' +


      '.key{' +

        'display:inline-block;' +

        'min-width:68px;' +

        'color:#A7A7AD;' +

        'font-weight:600;' +

      '}' +


      '.value{' +

        'color:#FFFFFF;' +

        'font-weight:500;' +

      '}' +


      '.ip .key,' +
      '.ip .value{' +

        'font-weight:650;' +

      '}' +


      '.google{' +

        'margin-top:3px;' +

      '}' +


      '.google .value{' +

        'font-weight:600;' +

      '}' +


      /* =====================================================
       * Evidence
       * ===================================================== */

      '.reason{' +

        'margin:0;' +

        'color:#FFFFFF;' +

        'font-size:12.4px;' +

        'line-height:1.42;' +

        'word-break:break-word;' +

      '}' +


      '.reasonKey{' +

        'color:#A7A7AD;' +

        'font-weight:600;' +

      '}' +


      /* =====================================================
       * Footer
       * ===================================================== */

      '.node{' +

        'color:#FFFFFF;' +

        'font-size:12.8px;' +

        'font-weight:500;' +

        'text-align:center;' +

        'line-height:1.35;' +

        'word-break:break-word;' +

      '}' +


      '.elapsed{' +

        'margin-top:4px;' +

        'color:#A7A7AD;' +

        'font-size:11.8px;' +

        'font-weight:500;' +

        'text-align:center;' +

        'line-height:1.30;' +

      '}' +


      '</style>' +

    '</head>' +


    '<body>' +


      /* =====================================================
       * Separator
       * ===================================================== */

      '<div class="sep">' +

        SEP +

      '</div>' +


      /* =====================================================
       * Header
       * ===================================================== */

      '<table class="header">' +

        '<tr>' +

          '<td class="title">' +

            'Google' +

          '</td>' +


          '<td class="status ' +

            esc(
              statusClass
            ) +

          '">' +

            statusIcon +

            ' ' +

            esc(
              statusText
            ) +

          '</td>' +

        '</tr>' +

      '</table>' +


      /*
       * Header
       * ↓
       * 空一行
       */

      '<div class="gap">&nbsp;</div>' +


      /* =====================================================
       * Block 1
       *
       * Protocol Stack
       * ===================================================== */

      '<div class="contentBlock">' +

        row(

          "协议栈",

          stack

        ) +


        row(

          "优先访问",

          preferredText

        ) +

      '</div>' +


      /*
       * Block 1
       * ↓
       * 空一行
       */

      '<div class="gap">&nbsp;</div>' +


      /* =====================================================
       * Block 2
       *
       * IPv4
       * ===================================================== */

      familyBlock(

        "IPv4",

        v4,

        judge4

      ) +


      /*
       * Block 2
       * ↓
       * 空一行
       */

      '<div class="gap">&nbsp;</div>' +


      /* =====================================================
       * Block 3
       *
       * IPv6
       * ===================================================== */

      familyBlock(

        "IPv6",

        v6,

        judge6

      ) +


      /*
       * Block 3
       * ↓
       * 空一行
       */

      '<div class="gap">&nbsp;</div>' +


      /* =====================================================
       * Block 4
       *
       * Evidence
       * ===================================================== */

      '<div class="contentBlock">' +

        '<div class="reason">' +

          '<span class="reasonKey">' +

            '依据：' +

          '</span>' +

          esc(

            evidence.join(
              "；"
            )

          ) +

        '</div>' +

      '</div>' +


      /*
       * Evidence
       * ↓
       * 空一小行
       */

      '<div class="gapSmall">&nbsp;</div>' +


      /* =====================================================
       * Bottom Separator
       * ===================================================== */

      '<div class="sep bottom">' +

        SEP +

      '</div>' +


      /*
       * Separator
       * ↓
       * 空一小行
       */

      '<div class="gapSmall">&nbsp;</div>' +


      /* =====================================================
       * Footer
       * ===================================================== */

      '<div class="node">' +

        '节点 ➟ ' +

        esc(
          POLICY ||
          "当前策略"
        ) +

      '</div>' +


      '<div class="elapsed">' +

        '检测耗时：' +

        elapsed +

        ' ms' +

      '</div>' +


    '</body>' +

    '</html>';


  $done({

    title:
      "Google 送中检测",

    htmlMessage:
      html

  });

}


/* =========================================================
 * Main
 *
 * 所有可独立请求全部并发。
 * ========================================================= */

function main() {

  /* ---------------------------------------------------------
   * IPv4
   * --------------------------------------------------------- */

  var p4 =
    probeV4();


  /* ---------------------------------------------------------
   * IPv6
   * --------------------------------------------------------- */

  var p6 =
    probeV6();


  /* ---------------------------------------------------------
   * IPPure
   * --------------------------------------------------------- */

  var pPure =
    fetchSoft(

      "https://my.ippure.com/v1/info",

      T_IPPURE,

      {
        "Accept":
          "application/json"
      }

    )

    .then(
      function (result) {

        return result.ok

          ? parsePure(
              result.body
            )

          : null;

      }
    );


  /* ---------------------------------------------------------
   * Preferred Family
   * --------------------------------------------------------- */

  var pPreferred =
    probePreferred();


  /* ---------------------------------------------------------
   * YouTube Premium
   * --------------------------------------------------------- */

  var pYoutube =
    fetchSoft(

      "https://www.youtube.com/premium",

      T_YOUTUBE,

      {
        "Accept-Language":
          "en-US,en;q=0.9"
      }

    )

    .then(
      parseYoutube
    );


  /* ---------------------------------------------------------
   * Google Actual Egress
   * --------------------------------------------------------- */

  var pMapping =
    fetchSoft(

      "https://redirector.googlevideo.com/report_mapping?di=no",

      T_MAPPING,

      {
        "Accept":
          "text/plain,*/*"
      }

    )

    .then(
      parseMapping
    );


  /* ---------------------------------------------------------
   * Google IPv4
   * --------------------------------------------------------- */

  var pGoogle4 =
    probeGoogle(
      "v4"
    );


  /* ---------------------------------------------------------
   * Google IPv6
   * --------------------------------------------------------- */

  var pGoogle6 =
    probeGoogle(
      "v6"
    );


  /* ---------------------------------------------------------
   * IPv4 Metadata
   *
   * IPv4 一拿到就立即启动。
   * --------------------------------------------------------- */

  var pMeta4 =
    p4.then(
      queryMeta
    );


  /* ---------------------------------------------------------
   * IPv6 Metadata
   * --------------------------------------------------------- */

  var pMeta6 =
    p6.then(
      queryMeta
    );


  /* ---------------------------------------------------------
   * Result
   * --------------------------------------------------------- */

  Promise
    .all([

      p4,

      p6,

      pPure,

      pPreferred,

      pYoutube,

      pMapping,

      pGoogle4,

      pGoogle6,

      pMeta4,

      pMeta6

    ])

    .then(
      function (result) {

        render({

          v4: {

            ip:
              result[0],

            google:
              result[6],

            profile:
              result[8]

          },


          v6: {

            ip:
              result[1],

            google:
              result[7],

            profile:
              result[9]

          },


          pure:
            result[2],


          preferred:
            result[3],


          youtube:
            result[4],


          mapping:
            result[5]

        });

      }
    )

    .catch(
      function (error) {

        console.log(

          "Google SendCN Error: " +

          String(
            error
          )

        );

      }
    );

}


/* =========================================================
 * Start
 * ========================================================= */

main();


/* =========================================================
 * Global Watchdog
 *
 * 不再生成“协议栈未知”的伪结果。
 * ========================================================= */

setTimeout(

  function () {

    if (
      FINISHED
    ) {

      return;

    }


    FINISHED = true;


    $done({

      title:
        "Google 送中检测",

      htmlMessage:

        '<div style="' +

        'color:#FFFFFF;' +

        'font-family:-apple-system,BlinkMacSystemFont,' +
        '\'SF Pro Text\',\'PingFang SC\',sans-serif;' +

        'font-size:13px;' +

        'line-height:1.5;' +

        'padding:6px;' +

        '">' +

        '🚦 网络请求超时' +

        '<br><br>' +

        '当前节点未能在检测时限内返回核心数据。' +

        '<br><br>' +

        '节点 ➟ ' +

        esc(
          POLICY ||
          "当前策略"
        ) +

        '</div>'

    });

  },

  GLOBAL_TIMEOUT

);