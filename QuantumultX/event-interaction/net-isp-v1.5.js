## 节点线路检测脚本，制作 by 翀𝙡𝙧 TG：https://t.me/chong_redaily
## 更新时间：2026-11-03
## 功能简介：结合入口与出口 IP、地区、ASN、BGP 和延迟信息，辅助分析节点网络与中转拓扑。

/**
 * Quantumult X - Node Network Analyzer
 * Version: 1.5
 *
 * =========================================================
 * 核心拓扑
 * =========================================================
 *
 * 直连：
 *
 *   用户运营商
 *       ↓
 *   BGP 网络
 *       ↓
 *   落地
 *
 *
 * 国内中转：
 *
 *   用户
 *       ↓
 *   中国大陆入口
 *       ↓
 *   海外落地
 *
 *
 * 海外中转：
 *
 *   用户
 *       ↓
 *   海外入口
 *       ↓
 *   另一地区落地
 *
 *
 * IEPL / IPLC / 专线：
 *
 * 仅作为节点名称声明，
 * 不参与一级拓扑分类。
 *
 *
 * =========================================================
 * 数据说明
 * =========================================================
 *
 * BGP：
 * RIPE RIS Looking Glass
 *
 * BGP 为控制平面关系，
 * 不等于真实 traceroute，
 * 不代表代理隧道内部路径。
 */


/* =========================================================
 * CONFIG
 * ========================================================= */

const CONFIG = {

  HTTP_TIMEOUT: 2600,

  DNS_TIMEOUT: 1900,

  LATENCY_TIMEOUT: 3500,

  BGP_TIMEOUT: 3000,

  BGP_CACHE_TTL:
    6 * 60 * 60 * 1000,

  GEO_CACHE_TTL:
    12 * 60 * 60 * 1000,

  /*
   * 默认 UI 精简。
   *
   * 调试时可打开。
   */

  SHOW_ASPATH: false,

  SHOW_IP: false,

  DEBUG: false

};


/* =========================================================
 * ASN NAME
 * ========================================================= */

const ASN_NAMES = {

  /* China Telecom */

  "4134": "中国电信",
  "4809": "CN2",
  "23764": "CTGNet",
  "4816": "中国电信",


  /* China Unicom */

  "4837": "中国联通",
  "9929": "CU 9929",
  "10099": "CU Global",


  /* China Mobile */

  "9808": "中国移动",
  "58453": "CMI",
  "58807": "CMIN2",


  /* Asia */

  "2516": "KDDI",
  "2914": "NTT",
  "3491": "PCCW",
  "4637": "Telstra",


  /* Global Transit */

  "174": "Cogent",
  "1299": "Arelion",
  "3356": "Lumen",
  "6939": "HE",
  "3257": "GTT",
  "6453": "Tata",
  "5511": "Orange",
  "6762": "Sparkle",
  "9002": "RETN",


  /* Cloud */

  "132203": "Tencent Global"

};


/* =========================================================
 * China carrier ASN groups
 * ========================================================= */

const CARRIERS = {

  telecom: {

    name:
      "中国电信",

    asns: [
      "4134",
      "4809",
      "23764",
      "4816"
    ]

  },


  unicom: {

    name:
      "中国联通",

    asns: [
      "4837",
      "9929",
      "10099"
    ]

  },


  mobile: {

    name:
      "中国移动",

    asns: [
      "9808",
      "58453",
      "58807"
    ]

  }

};


/* =========================================================
 * MAIN
 * ========================================================= */

(async () => {

  try {

    if (
      typeof $environment === "undefined" ||
      $environment.executor !== "event-interaction"
    ) {

      throw new Error(
        "请从 Quantumult X 节点菜单运行"
      );

    }


    const nodeName =
      String(
        $environment.params || ""
      ).trim();


    if (!nodeName) {

      throw new Error(
        "无法获取当前节点"
      );

    }


    /*
     * ---------------------------------------------
     * 基础任务并行
     * ---------------------------------------------
     */

    const nodePromise =
      getNodeInfo(
        nodeName
      );


    const localPromise =
      getSelfGeo(
        "direct"
      );


    const exitPromise =
      getSelfGeo(
        nodeName
      );


    const latencyPromise =
      getLatency(
        nodeName
      );


    const [
      node,
      localGeo,
      exitGeo
    ] = await Promise.all([

      nodePromise,
      localPromise,
      exitPromise

    ]);


    /*
     * 用户运营商
     */

    const carrier =
      detectCarrier(
        localGeo
      );


    /*
     * 节点入口
     */

    const entrance =
      await getEntranceInfo(

        node.host,

        exitGeo

      );


    /*
     * 节点名称声明
     */

    const declared =
      parseDeclaredTags(
        nodeName
      );


    /*
     * 拓扑分类
     */

    const topology =
      classifyTopology({

        entrance,
        exitGeo

      });


    /*
     * 延迟
     */

    const latency =
      await latencyPromise;


    /*
     * ---------------------------------------------
     * BGP
     * ---------------------------------------------
     */

    let directBGP = null;

    let accessBGP = null;

    let landingBGP = null;


    /*
     * 直连
     */

    if (
      topology.type === "direct"
    ) {

      directBGP =
        await getBGPArchitecture(

          exitGeo.ip,

          {

            name:
              carrier.name,

            asns:
              carrier.asns

          },

          exitGeo

        );

    }


    /*
     * 中转
     */

    else {

      const entryGeo =
        entrance.geo ||
        emptyGeo();


      const entryASN =
        normalizeASN(
          entryGeo.asn
        );


      [
        accessBGP,
        landingBGP

      ] = await Promise.all([


        /*
         * 用户 → 入口
         */

        entrance.primaryIP

          ? getBGPArchitecture(

              entrance.primaryIP,

              {

                name:
                  carrier.name,

                asns:
                  carrier.asns

              },

              entryGeo

            )

          : Promise.resolve(
              null
            ),


        /*
         * 入口 → 落地
         */

        exitGeo.ip

          ? getBGPArchitecture(

              exitGeo.ip,

              {

                name:
                  networkNameFromGeo(
                    entryGeo
                  ),

                asns:
                  entryASN
                    ? [entryASN]
                    : []

              },

              exitGeo

            )

          : Promise.resolve(
              null
            )

      ]);

    }


    const report = {

      nodeName,

      localGeo,

      carrier,

      entrance,

      exitGeo,

      declared,

      topology,

      latency,

      directBGP,

      accessBGP,

      landingBGP

    };


    debug(
      "REPORT",
      report
    );


    $done({

      title:
        "节点网络分析",

      htmlMessage:
        buildHtml(
          report
        )

    });


  } catch (e) {

    $done({

      title:
        "节点网络分析",

      htmlMessage: `

      <div style="
        font-family:-apple-system;
        padding:12px;
        font-size:14px;
      ">

        <b>❌ 检测失败</b>

        <br><br>

        ${
          escapeHtml(
            e && e.message
              ? e.message
              : String(e)
          )
        }

      </div>

      `

    });

  }

})();


/* =========================================================
 * NODE INFO
 * ========================================================= */

async function getNodeInfo(
  nodeName
) {

  const res =
    await withTimeout(

      $configuration.sendMessage({

        action:
          "get_server_description",

        content:
          nodeName

      }),

      CONFIG.HTTP_TIMEOUT

    );


  if (
    !res ||
    res.error
  ) {

    throw new Error(

      res && res.error

        ? res.error

        : "读取节点配置失败"

    );

  }


  const desc =

    res.ret?.[nodeName]

    ||

    Object.values(
      res.ret || {}
    )[0];


  if (!desc) {

    throw new Error(
      "节点配置为空"
    );

  }


  const parsed =
    parseServerDescription(
      String(desc)
    );


  if (!parsed.host) {

    throw new Error(
      "无法解析节点入口"
    );

  }


  return parsed;

}


/* =========================================================
 * PARSE SERVER
 * ========================================================= */

function parseServerDescription(
  desc
) {

  const match =
    desc.match(

      /^\s*([^=,\s]+)\s*=\s*(\[[^\]]+\]|[^,\s:]+):(\d+)/i

    );


  if (!match) {

    return {

      protocol: "",

      host: "",

      port: ""

    };

  }


  return {

    protocol:
      match[1],

    host:
      stripIPv6Brackets(
        match[2]
      ),

    port:
      match[3]

  };

}


/* =========================================================
 * ENTRANCE
 * ========================================================= */

async function getEntranceInfo(
  host,
  exitGeo
) {

  if (!host) {

    return {

      host: "",

      ips: [],

      primaryIP: "",

      matchedExit: false,

      geo:
        emptyGeo()

    };

  }


  /*
   * 节点直接填写 IP
   */

  if (
    isIP(host)
  ) {

    const ip =
      stripIPv6Brackets(
        host
      );


    const matchedExit =

      normalizeIP(ip) ===
      normalizeIP(
        exitGeo?.ip
      );


    return {

      host,

      ips:
        [ip],

      primaryIP:
        ip,

      matchedExit,

      geo:

        matchedExit

          ? exitGeo

          : await getGeoByIP(
              ip
            )

    };

  }


  /*
   * 域名入口
   */

  const resolved =
    await resolveEntranceHost(
      host
    );


  const ips =
    unique(

      resolved

        .map(
          normalizeIP
        )

        .filter(Boolean)

    );


  const exitIP =
    normalizeIP(
      exitGeo?.ip
    );


  /*
   * 任意入口 DNS IP
   * 与出口一致
   */

  const matchedExit =

    !!exitIP &&

    ips.includes(
      exitIP
    );


  if (
    matchedExit
  ) {

    return {

      host,

      ips,

      primaryIP:
        exitGeo.ip,

      matchedExit:
        true,

      geo:
        exitGeo

    };

  }


  const primaryIP =
    ips[0] ||
    "";


  const geo =

    primaryIP

      ? await getGeoByIP(
          primaryIP
        )

      : emptyGeo();


  return {

    host,

    ips,

    primaryIP,

    matchedExit:
      false,

    geo

  };

}


/* =========================================================
 * DNS
 * ========================================================= */

async function resolveEntranceHost(
  host
) {

  /*
   * IPv4 优先
   */

  let result =
    await resolveAllDNS(

      host,

      "A"

    );


  if (
    result.length
  ) {

    return result;

  }


  return await resolveAllDNS(

    host,

    "AAAA"

  );

}


async function resolveAllDNS(
  host,
  type
) {

  /*
   * 三个 resolver 同时查，
   * AliDNS 排在前面，
   * 但不会因为单个 resolver 卡死拖慢整体。
   */

  const results =
    await Promise.all([

      resolveAli(
        host,
        type
      ),

      resolveCloudflare(
        host,
        type
      ),

      resolveGoogle(
        host,
        type
      )

    ]);


  return unique(
    results.flat()
  );

}


/* =========================================================
 * AliDNS
 * ========================================================= */

async function resolveAli(
  host,
  type
) {

  try {

    const url =

      "http://223.6.6.6/resolve" +

      "?edns_client_subnet=223.6.6.6%2F24" +

      `&name=${encodeURIComponent(host)}` +

      "&short=1" +

      `&type=${type}`;


    const res =
      await withTimeout(

        $task.fetch({

          url,

          opts: {
            policy:
              "direct"
          }

        }),

        CONFIG.DNS_TIMEOUT

      );


    const data =
      JSON.parse(
        res.body ||
        "[]"
      );


    return (

      Array.isArray(data)
        ? data
        : []

    )

      .map(
        item =>
          String(item)
            .split(",")[0]
            .trim()
      )

      .filter(
        ip =>
          type === "A"

            ? isIPv4(ip)

            : isIPv6(ip)
      );


  } catch (_) {

    return [];

  }

}


/* =========================================================
 * DoH
 * ========================================================= */

async function resolveCloudflare(
  host,
  type
) {

  return resolveDoH(

    "https://cloudflare-dns.com/dns-query",

    host,

    type

  );

}


async function resolveGoogle(
  host,
  type
) {

  return resolveDoH(

    "https://dns.google/resolve",

    host,

    type

  );

}


async function resolveDoH(
  base,
  host,
  type
) {

  try {

    const data =
      await fetchJSON({

        url:

          `${base}?name=${encodeURIComponent(host)}` +
          `&type=${type}`,

        opts: {
          policy:
            "direct"
        },

        headers: {
          Accept:
            "application/dns-json"
        }

      });


    const expected =
      type === "A"
        ? 1
        : 28;


    const answers =

      Array.isArray(
        data?.Answer
      )

        ? data.Answer

        : [];


    return answers

      .filter(
        item =>
          Number(
            item.type
          ) === expected
      )

      .map(
        item =>
          stripIPv6Brackets(
            item.data
          )
      )

      .filter(
        ip =>
          type === "A"

            ? isIPv4(ip)

            : isIPv6(ip)
      );


  } catch (_) {

    return [];

  }

}


/* =========================================================
 * TOPOLOGY
 * ========================================================= */

function classifyTopology({

  entrance,

  exitGeo

}) {

  const entry =
    entrance?.geo ||
    emptyGeo();


  const exit =
    exitGeo ||
    emptyGeo();


  /*
   * 入口 DNS 命中出口
   */

  if (
    entrance?.matchedExit
  ) {

    return {

      type:
        "direct",

      label:
        "直连"

    };

  }


  const entryIP =
    normalizeIP(
      entrance?.primaryIP
    );


  const exitIP =
    normalizeIP(
      exit.ip
    );


  const entryASN =
    normalizeASN(
      entry.asn
    );


  const exitASN =
    normalizeASN(
      exit.asn
    );


  const entryCountry =
    normalizeCountry(
      entry.countryCode
    );


  const exitCountry =
    normalizeCountry(
      exit.countryCode
    );


  const sameCountry =

    !!entryCountry &&
    !!exitCountry &&
    entryCountry ===
      exitCountry;


  const sameASN =

    !!entryASN &&
    !!exitASN &&
    entryASN ===
      exitASN;


  const separatedIP =

    !!entryIP &&
    !!exitIP &&
    entryIP !==
      exitIP;


  const separatedASN =

    !!entryASN &&
    !!exitASN &&
    entryASN !==
      exitASN;


  /*
   * 同 ASN / 同地区
   *
   * NAT、VIP、LB、多 A 等。
   */

  if (
    sameCountry &&
    sameASN
  ) {

    return {

      type:
        "direct",

      label:
        "直连 · 同网"

    };

  }


  /*
   * 国内中转
   */

  if (

    entryCountry === "CN" &&

    exitCountry &&
    exitCountry !== "CN" &&

    (
      separatedIP ||
      separatedASN
    )

  ) {

    return {

      type:
        "relay-domestic",

      label:
        "国内中转"

    };

  }


  /*
   * 海外中转
   */

  if (

    entryCountry &&
    exitCountry &&

    entryCountry !== "CN" &&
    exitCountry !== "CN" &&

    entryCountry !==
      exitCountry &&

    (
      separatedIP ||
      separatedASN
    )

  ) {

    return {

      type:
        "relay-foreign",

      label:
        "海外中转"

    };

  }


  /*
   * 同地区不同网络
   */

  if (

    sameCountry &&

    separatedIP &&
    separatedASN

  ) {

    return {

      type:
        "relay-regional",

      label:
        "同地区中转"

    };

  }


  /*
   * 没有足够的拓扑证据；保留简洁布局。
   */

  return {

    type:
      "direct",

    label:
      "拓扑未确认"

  };

}


/* =========================================================
 * DECLARED TAGS
 * ========================================================= */

function parseDeclaredTags(
  name
) {

  const text =
    String(
      name || ""
    );


  const tags =
    [];


  if (
    /IEPL/i.test(text)
  ) {

    tags.push(
      "IEPL"
    );

  }


  if (
    /IPLC/i.test(text)
  ) {

    tags.push(
      "IPLC"
    );

  }


  if (
    /专线/i.test(text)
  ) {

    tags.push(
      "专线"
    );

  }


  return {

    tags:
      unique(tags),

    text:
      unique(tags)
        .join(" / ")

  };

}


/* =========================================================
 * USER CARRIER
 * ========================================================= */

function detectCarrier(
  geo
) {

  const text =

    [
      geo?.isp,
      geo?.org
    ]

      .filter(Boolean)

      .join(" ")

      .toLowerCase();


  if (
    /电信|telecom|chinanet/.test(
      text
    )
  ) {

    return {

      name:
        "中国电信",

      asns:
        CARRIERS.telecom.asns

    };

  }


  if (
    /联通|unicom/.test(
      text
    )
  ) {

    return {

      name:
        "中国联通",

      asns:
        CARRIERS.unicom.asns

    };

  }


  if (
    /移动|china mobile|cmcc/.test(
      text
    )
  ) {

    return {

      name:
        "中国移动",

      asns:
        CARRIERS.mobile.asns

    };

  }


  const asn =
    normalizeASN(
      geo?.asn
    );


  for (
    const carrier
    of Object.values(
      CARRIERS
    )
  ) {

    if (
      carrier.asns.includes(
        asn
      )
    ) {

      return {

        name:
          carrier.name,

        asns:
          carrier.asns

      };

    }

  }


  return {

    name:
      normalizeOrgName(

        geo?.isp ||
        geo?.org ||
        "当前网络"

      ),

    asns:
      asn
        ? [asn]
        : []

  };

}


/* =========================================================
 * BGP
 * ========================================================= */

async function getBGPArchitecture(

  targetIP,

  source,

  targetGeo

) {

  if (!targetIP) {

    return null;

  }


  const paths =
    await getBGPRoutes(
      targetIP
    );


  const targetName =
    networkNameFromGeo(
      targetGeo
    );


  if (
    !paths.length
  ) {

    return {

      architecture:
        uniqueAdjacent(
          [
            source?.name,
            targetName
          ].filter(Boolean)
        ),

      asPath: []

    };

  }


  const targetASN =

    normalizeASN(
      targetGeo?.asn
    )

    ||

    mostCommonOrigin(
      paths
    );


  let validPaths =

    targetASN

      ? paths.filter(

          path =>
            path[
              path.length - 1
            ] === targetASN

        )

      : paths;


  if (
    !validPaths.length
  ) {

    validPaths =
      paths;

  }


  const matched =
    selectSourcePath(

      validPaths,

      source?.asns || []

    );


  if (
    matched
  ) {

    return {

      architecture:
        buildHumanArchitecture(

          matched,

          source,

          targetGeo

        ),

      asPath:
        matched

    };

  }


  const upstream =
    mostCommonUpstream(

      validPaths,

      targetASN

    );


  const architecture =
    [];


  if (
    source?.name
  ) {

    architecture.push(
      source.name
    );

  }


  if (
    upstream
  ) {

    architecture.push(

      ASN_NAMES[
        upstream
      ]

      ||

      `AS${upstream}`

    );

  }


  if (
    targetName
  ) {

    architecture.push(
      targetName
    );

  }


  return {

    architecture:
      compactArchitecture(

        uniqueAdjacent(
          architecture
        )

      ),

    asPath:
      [
        upstream,
        targetASN
      ].filter(Boolean)

  };

}


/* =========================================================
 * RIPE RIS
 * ========================================================= */

async function getBGPRoutes(
  ip
) {

  const cached =
    cacheGet(

      "bgp",

      ip,

      CONFIG.BGP_CACHE_TTL

    );


  if (
    cached
  ) {

    return cached;

  }


  try {

    const data =
      await withTimeout(

        fetchJSON({

          url:

            "https://stat.ripe.net/data/" +
            "looking-glass/data.json" +
            `?resource=${encodeURIComponent(ip)}`,

          opts: {
            policy:
              "direct"
          }

        }),

        CONFIG.BGP_TIMEOUT

      );


    const rrcs =
      data?.data?.rrcs ||
      [];


    const paths =
      [];


    for (
      const rrc
      of rrcs
    ) {

      const peers =
        rrc?.peers ||
        [];


      for (
        const peer
        of peers
      ) {

        const path =
          normalizeASPath(
            peer?.as_path
          );


        if (
          path.length >= 2
        ) {

          paths.push(
            path
          );

        }

      }

    }


    if (
      paths.length
    ) {

      cacheSet(

        "bgp",

        ip,

        paths

      );

    }


    return paths;


  } catch (e) {

    debug(
      "BGP ERROR",
      String(e)
    );


    return [];

  }

}


/* =========================================================
 * AS PATH
 * ========================================================= */

function normalizeASPath(
  value
) {

  if (!value) {

    return [];

  }


  const raw =

    Array.isArray(value)

      ? JSON.stringify(
          value
        )

      : String(value);


  const numbers =
    raw.match(
      /\d+/g
    ) || [];


  return uniqueAdjacent(

    numbers
      .map(
        normalizeASN
      )
      .filter(Boolean)

  );

}


/* =========================================================
 * SELECT SOURCE
 * ========================================================= */

function selectSourcePath(

  paths,

  sourceASNs

) {

  if (
    !sourceASNs?.length
  ) {

    return null;

  }


  const candidates =
    [];


  for (
    const path
    of paths
  ) {

    let index =
      -1;


    for (
      let i = 0;
      i < path.length;
      i++
    ) {

      if (
        sourceASNs.includes(
          path[i]
        )
      ) {

        index =
          i;

        break;

      }

    }


    if (
      index >= 0
    ) {

      candidates.push(

        path.slice(
          index
        )

      );

    }

  }


  if (
    !candidates.length
  ) {

    return null;

  }


  const counter =
    {};


  for (
    const path
    of candidates
  ) {

    const key =
      path.join(">");


    counter[key] =
      (
        counter[key] ||
        0
      ) + 1;

  }


  const sorted =
    Object.entries(
      counter
    )

      .sort(
        (a, b) =>
          b[1] - a[1]
      );


  if (
    !sorted.length
  ) {

    return null;

  }


  return sorted[0][0]
    .split(">");

}


/* =========================================================
 * COMMON BGP
 * ========================================================= */

function mostCommonOrigin(
  paths
) {

  const counter =
    {};


  for (
    const path
    of paths
  ) {

    const asn =
      path[
        path.length - 1
      ];


    if (!asn) {
      continue;
    }


    counter[asn] =
      (
        counter[asn] ||
        0
      ) + 1;

  }


  return mostCommonKey(
    counter
  );

}


function mostCommonUpstream(

  paths,

  originASN

) {

  const counter =
    {};


  for (
    const path
    of paths
  ) {

    if (
      path.length < 2
    ) {

      continue;

    }


    if (

      originASN &&

      path[
        path.length - 1
      ] !== originASN

    ) {

      continue;

    }


    const upstream =
      path[
        path.length - 2
      ];


    if (
      !upstream ||
      upstream === originASN
    ) {

      continue;

    }


    counter[upstream] =
      (
        counter[upstream] ||
        0
      ) + 1;

  }


  return mostCommonKey(
    counter
  );

}


function mostCommonKey(
  counter
) {

  const arr =
    Object.entries(
      counter
    );


  if (
    !arr.length
  ) {

    return "";

  }


  arr.sort(

    (a, b) =>
      b[1] - a[1]

  );


  return arr[0][0];

}


/* =========================================================
 * HUMAN BGP
 * ========================================================= */

function buildHumanArchitecture(

  path,

  source,

  targetGeo

) {

  const result =
    [];


  const targetName =
    networkNameFromGeo(
      targetGeo
    );


  for (
    let i = 0;
    i < path.length;
    i++
  ) {

    const asn =
      path[i];


    let name =
      "";


    if (
      source?.asns?.includes(
        asn
      )
    ) {

      name =
        source.name;

    }


    else if (
      i ===
        path.length - 1
    ) {

      name =
        targetName;

    }


    else {

      name =

        ASN_NAMES[
          asn
        ]

        ||

        `AS${asn}`;

    }


    if (

      name &&

      result[
        result.length - 1
      ] !== name

    ) {

      result.push(
        name
      );

    }

  }


  return compactArchitecture(
    result
  );

}


/* =========================================================
 * COMPACT BGP
 * ========================================================= */

function compactArchitecture(
  list
) {

  list =
    uniqueAdjacent(
      list.filter(Boolean)
    );


  /*
   * 最多显示四层。
   */

  if (
    list.length <= 4
  ) {

    return list;

  }


  return [

    list[0],

    list[1],

    "…",

    list[
      list.length - 1
    ]

  ];

}


/* =========================================================
 * NETWORK NAME
 * ========================================================= */

function networkNameFromGeo(
  geo
) {

  if (!geo) {

    return "未知网络";

  }


  /*
   * 中国大陆优先运营商
   */

  if (
    normalizeCountry(
      geo.countryCode
    ) === "CN"
  ) {

    const carrier =
      detectChinaCarrier(
        geo
      );


    if (
      carrier
    ) {

      return carrier;

    }

  }


  const org =
    normalizeOrgName(

      geo.org ||
      geo.isp ||
      ""

    );


  if (
    org
  ) {

    return org;

  }


  const asn =
    normalizeASN(
      geo.asn
    );


  return (

    ASN_NAMES[
      asn
    ]

    ||

    (
      asn
        ? `AS${asn}`
        : "未知网络"
    )

  );

}


/* =========================================================
 * CHINA CARRIER
 * ========================================================= */

function detectChinaCarrier(
  geo
) {

  const text =

    [
      geo?.isp,
      geo?.org
    ]

      .filter(Boolean)

      .join(" ")

      .toLowerCase();


  const asn =
    normalizeASN(
      geo?.asn
    );


  if (

    /电信|telecom|chinanet/.test(
      text
    )

    ||

    CARRIERS.telecom.asns.includes(
      asn
    )

  ) {

    return "中国电信";

  }


  if (

    /联通|unicom/.test(
      text
    )

    ||

    CARRIERS.unicom.asns.includes(
      asn
    )

  ) {

    return "中国联通";

  }


  if (

    /移动|china mobile|cmcc/.test(
      text
    )

    ||

    CARRIERS.mobile.asns.includes(
      asn
    )

  ) {

    return "中国移动";

  }


  return "";

}


/* =========================================================
 * ORG NORMALIZATION
 * ========================================================= */

function normalizeOrgName(
  value
) {

  if (!value) {

    return "";

  }


  const original =
    String(value)
      .trim();


  const text =
    original
      .toLowerCase();


  if (
    /tencent/.test(text)
  ) {

    return "Tencent Cloud";

  }


  if (
    /alibaba|aliyun|alicloud/.test(
      text
    )
  ) {

    return "Alibaba Cloud";

  }


  if (
    /oracle/.test(text)
  ) {

    return "Oracle";

  }


  if (
    /amazon|aws/.test(text)
  ) {

    return "AWS";

  }


  if (
    /google/.test(text)
  ) {

    return "Google";

  }


  if (
    /microsoft|azure/.test(
      text
    )
  ) {

    return "Microsoft";

  }


  if (
    /cloudflare/.test(
      text
    )
  ) {

    return "Cloudflare";

  }


  if (
    /sakura international/.test(
      text
    )
  ) {

    return "SAKURA INTERNATIONAL";

  }


  if (
    /sakura link/.test(
      text
    )
  ) {

    return "SAKURA LINK";

  }


  if (
    /sakura internet/.test(
      text
    )
  ) {

    return "SAKURA Internet";

  }


  if (
    /ikuuu/.test(text)
  ) {

    return "Ikuuu Network";

  }


  if (
    /kddi/.test(text)
  ) {

    return "KDDI";

  }


  if (
    /\bntt\b/.test(text)
  ) {

    return "NTT";

  }


  if (
    /hurricane electric/.test(
      text
    )
  ) {

    return "HE";

  }


  if (
    /arelion|telia carrier/.test(
      text
    )
  ) {

    return "Arelion";

  }


  if (
    /cogent/.test(text)
  ) {

    return "Cogent";

  }


  if (
    /pccw/.test(text)
  ) {

    return "PCCW";

  }


  let cleaned =
    original

      .replace(
        /\b(Limited|Ltd\.?|Inc\.?|LLC|Corporation|Corp\.?|Company|Co\.?)\b/gi,
        ""
      )

      .replace(
        /\s+/g,
        " "
      )

      .trim();


  if (
    cleaned.length > 24
  ) {

    cleaned =
      cleaned.slice(
        0,
        24
      );

  }


  return cleaned;

}


/* =========================================================
 * LATENCY
 * ========================================================= */

async function getLatency(
  nodeName
) {

  try {

    const res =
      await withTimeout(

        $configuration.sendMessage({

          action:
            "url_latency_benchmark",

          content:
            [nodeName]

        }),

        CONFIG.LATENCY_TIMEOUT

      );


    const arr =
      res?.ret?.[
        nodeName
      ];


    if (
      !Array.isArray(
        arr
      )
    ) {

      return {

        tcp: null,

        http: null

      };

    }


    return {

      tcp:
        validLatency(
          arr[0]
        ),

      http:
        validLatency(
          arr[1]
        )

    };


  } catch (_) {

    return {

      tcp: null,

      http: null

    };

  }

}


/* =========================================================
 * GEO
 * ========================================================= */

async function getSelfGeo(
  policy
) {

  const result =
    await raceGeo([

      getIpSbSelf(
        policy
      ),

      getIpWhoSelf(
        policy
      )

    ]);


  return result ||
    emptyGeo();

}


async function getGeoByIP(
  ip
) {

  if (!ip) {

    return emptyGeo();

  }


  const cached =
    cacheGet(

      "geo",

      ip,

      CONFIG.GEO_CACHE_TTL

    );


  if (
    cached
  ) {

    return cached;

  }


  const result =
    await raceGeo([

      getIpSbIP(
        ip
      ),

      getIpWhoIP(
        ip
      )

    ]);


  const geo =
    result ||
    emptyGeo(ip);


  if (
    result && geo.ip
  ) {

    cacheSet(

      "geo",

      ip,

      geo

    );

  }


  return geo;

}


/* =========================================================
 * GEO PROVIDERS
 * ========================================================= */

async function getIpSbSelf(
  policy
) {

  try {

    return normalizeIpSb(

      await fetchJSON({

        url:
          "https://api.ip.sb/geoip",

        opts: {
          policy
        },

        headers: {

          "User-Agent":
            "QuantumultX-NetworkAnalyzer/1.5"

        }

      })

    );


  } catch (_) {

    return null;

  }

}


async function getIpWhoSelf(
  policy
) {

  try {

    return normalizeIpWho(

      await fetchJSON({

        url:
          "https://ipwho.is/",

        opts: {
          policy
        }

      })

    );


  } catch (_) {

    return null;

  }

}


async function getIpSbIP(
  ip
) {

  try {

    return normalizeIpSb(

      await fetchJSON({

        url:
          `https://api.ip.sb/geoip/${encodeURIComponent(ip)}`,

        opts: {
          policy:
            "direct"
        },

        headers: {

          "User-Agent":
            "QuantumultX-NetworkAnalyzer/1.5"

        }

      })

    );


  } catch (_) {

    return null;

  }

}


async function getIpWhoIP(
  ip
) {

  try {

    return normalizeIpWho(

      await fetchJSON({

        url:
          `https://ipwho.is/${encodeURIComponent(ip)}`,

        opts: {
          policy:
            "direct"
        }

      })

    );


  } catch (_) {

    return null;

  }

}


async function raceGeo(
  promises
) {

  return firstValid(

    promises,

    CONFIG.HTTP_TIMEOUT,

    value =>
      value &&
      value.ip

  );

}


/* =========================================================
 * NORMALIZE GEO
 * ========================================================= */

function normalizeIpWho(
  data
) {

  if (
    !data ||
    data.success === false
  ) {

    return null;

  }


  const connection =
    data.connection ||
    {};


  return {

    ip:
      data.ip || "",

    countryCode:
      normalizeCountry(
        data.country_code
      ),

    country:
      data.country || "",

    region:
      data.region || "",

    city:
      data.city || "",

    asn:
      normalizeASN(
        connection.asn
      ),

    isp:
      connection.isp || "",

    org:
      connection.org || ""

  };

}


function normalizeIpSb(
  data
) {

  if (
    !data?.ip
  ) {

    return null;

  }


  return {

    ip:
      data.ip || "",

    countryCode:
      normalizeCountry(
        data.country_code
      ),

    country:
      data.country || "",

    region:
      data.region || "",

    city:
      data.city || "",

    asn:
      normalizeASN(
        data.asn
      ),

    isp:
      data.isp || "",

    org:
      data.organization ||
      data.org ||
      ""

  };

}


function emptyGeo(
  ip = ""
) {

  return {

    ip,

    countryCode: "",

    country: "",

    region: "",

    city: "",

    asn: "",

    isp: "",

    org: ""

  };

}


/* =========================================================
 * UI
 * ========================================================= */

function buildHtml(
  report
) {

  if (
    report.topology.type ===
      "direct"
  ) {

    return buildDirectUI(
      report
    );

  }


  return buildRelayUI(
    report
  );

}


/* =========================================================
 * DIRECT UI
 * ========================================================= */

function buildDirectUI(
  r
) {

  const exit =
    pointLabel(
      r.exitGeo
    );


  const architecture =
    architectureText(

      r.directBGP,

      [

        r.carrier.name,

        networkNameFromGeo(
          r.exitGeo
        )

      ]

    );


  const aspath =
    formatASPath(
      r.directBGP
    );


  return page(

    r.nodeName,

    r.topology.label,

    `

    <div class="topology">


      <div class="place">

        ${escapeHtml(
          userLabel(
            r
          )
        )}

      </div>


      <div class="arrow">

        ↓

        ${
          r.latency?.tcp != null

            ? `<b>${formatMs(
                r.latency.tcp
              )}</b>`

            : ""
        }

      </div>


      <div class="place">

        ${escapeHtml(
          exit
        )}

      </div>


    </div>


    <div class="section">

      <div class="section-title">

        BGP 架构

      </div>


      <div class="bgp-path">

        ${escapeHtml(
          architecture
        )}

      </div>


      ${
        aspath

          ? `

          <div class="aspath">

            ${escapeHtml(
              aspath
            )}

          </div>

          `

          : ""
      }

    </div>


    <div class="section compact">


      ${summaryRow(
        "落地",
        exit
      )}


      ${summaryRow(
        "网络",
        networkSummary(
          r.exitGeo
        )
      )}


      ${summaryRow(
        "延迟",
        latencySummary(
          r.latency
        )
      )}


      ${
        r.declared.text

          ? summaryRow(
              "标注",
              r.declared.text
            )

          : ""
      }


      ${
        CONFIG.SHOW_IP

          ? summaryRow(
              "IP",
              r.exitGeo?.ip ||
              "-"
            )

          : ""
      }


    </div>


    ${
      r.declared.text

        ? `

        <div class="note">

          ${escapeHtml(
            r.declared.text
          )}
          为节点名称声明，
          不参与拓扑分类

        </div>

        `

        : ""
    }

    `

  );

}


/* =========================================================
 * RELAY UI
 * ========================================================= */

function buildRelayUI(
  r
) {

  const entryGeo =
    r.entrance?.geo ||
    emptyGeo();


  const entry =
    pointLabel(
      entryGeo
    );


  const exit =
    pointLabel(
      r.exitGeo
    );


  const access =
    architectureText(

      r.accessBGP,

      [

        r.carrier.name,

        networkNameFromGeo(
          entryGeo
        )

      ]

    );


  const landing =
    architectureText(

      r.landingBGP,

      [

        networkNameFromGeo(
          entryGeo
        ),

        networkNameFromGeo(
          r.exitGeo
        )

      ]

    );


  const accessAS =
    formatASPath(
      r.accessBGP
    );


  const landingAS =
    formatASPath(
      r.landingBGP
    );


  return page(

    r.nodeName,

    r.topology.label,

    `

    <div class="topology">


      <div class="place">

        ${escapeHtml(
          userLabel(
            r
          )
        )}

      </div>


      <div class="arrow">

        ↓

        ${
          r.latency?.tcp != null

            ? `<b>${formatMs(
                r.latency.tcp
              )}</b>`

            : ""
        }

      </div>


      <div class="place">

        ${escapeHtml(
          entry
        )}

      </div>


      <div class="arrow">

        ↓

      </div>


      <div class="place">

        ${escapeHtml(
          exit
        )}

      </div>


    </div>


    <div class="section">


      <div class="section-title">

        接入 BGP

      </div>


      <div class="bgp-path">

        ${escapeHtml(
          access
        )}

      </div>


      ${
        accessAS

          ? `

          <div class="aspath">

            ${escapeHtml(
              accessAS
            )}

          </div>

          `

          : ""
      }


    </div>


    <div class="section">


      <div class="section-title">

        落地 BGP

      </div>


      <div class="bgp-path">

        ${escapeHtml(
          landing
        )}

      </div>


      ${
        landingAS

          ? `

          <div class="aspath">

            ${escapeHtml(
              landingAS
            )}

          </div>

          `

          : ""
      }


    </div>


    <div class="section compact">


      ${summaryRow(
        "入口",
        entry
      )}


      ${summaryRow(
        "落地",
        exit
      )}


      ${summaryRow(
        "延迟",
        latencySummary(
          r.latency
        )
      )}


      ${
        r.declared.text

          ? summaryRow(
              "标注",
              r.declared.text
            )

          : ""
      }


      ${
        CONFIG.SHOW_IP

          ? summaryRow(
              "入口 IP",
              r.entrance?.primaryIP ||
              "-"
            )

          : ""
      }


      ${
        CONFIG.SHOW_IP

          ? summaryRow(
              "落地 IP",
              r.exitGeo?.ip ||
              "-"
            )

          : ""
      }


    </div>


    ${
      r.declared.text

        ? `

        <div class="note">

          ${escapeHtml(
            r.declared.text
          )}
          为节点名称声明；
          当前实际检测结果为
          ${escapeHtml(
            r.topology.label
          )}

        </div>

        `

        : ""
    }


    <div class="note">

      两段 BGP 均为公网控制平面参考，
      不代表代理隧道内部实际路径

    </div>

    `

  );

}


/* =========================================================
 * UI TEXT HELPERS
 * ========================================================= */

function userLabel(
  r
) {

  return [

    flag(
      r.localGeo?.countryCode
    ),

    r.carrier?.name

  ]

    .filter(Boolean)

    .join(" ");

}


function pointLabel(
  geo
) {

  if (!geo) {

    return "-";

  }


  const location =

    geo.city ||

    geo.region ||

    geo.country ||

    "";


  return [

    flag(
      geo.countryCode
    ),

    location,

    networkNameFromGeo(
      geo
    )

  ]

    .filter(Boolean)

    .join(" · ")

    ||

    "-";

}


function networkSummary(
  geo
) {

  if (!geo) {

    return "-";

  }


  const asn =
    normalizeASN(
      geo.asn
    );


  const network =
    networkNameFromGeo(
      geo
    );


  return [

    network,

    asn
      ? `AS${asn}`
      : ""

  ]

    .filter(Boolean)

    .join(" · ")

    ||

    "-";

}


function latencySummary(
  latency
) {

  const tcp =
    formatMs(
      latency?.tcp
    );


  const http =
    formatMs(
      latency?.http
    );


  return (
    `TCP ${tcp} · HTTP ${http}`
  );

}


/* =========================================================
 * ARCHITECTURE DISPLAY
 * ========================================================= */

function architectureText(
  bgp,
  fallback
) {

  const list =

    bgp?.architecture?.length

      ? bgp.architecture

      : fallback;


  const result =
    uniqueAdjacent(
      list.filter(Boolean)
    );


  if (
    result.length === 1
  ) {

    return (
      result[0] +
      " · 同网"
    );

  }


  return result.join(
    " → "
  );

}


function formatASPath(
  bgp
) {

  if (
    !CONFIG.SHOW_ASPATH ||
    !bgp?.asPath?.length
  ) {

    return "";

  }


  return (

    "AS Path · " +

    bgp.asPath

      .map(
        asn =>
          `AS${asn}`
      )

      .join(
        " → "
      )

  );

}


/* =========================================================
 * SUMMARY ROW
 * ========================================================= */

function summaryRow(
  key,
  value
) {

  return `

  <div class="row">

    <span class="key">

      ${escapeHtml(
        key
      )}

    </span>


    <span class="value">

      ${escapeHtml(
        value || "-"
      )}

    </span>

  </div>

  `;

}


/* =========================================================
 * PAGE
 * ========================================================= */

function page(
  name,
  badge,
  content
) {

  return `

<style>

* {
  box-sizing:border-box;
}

body {

  margin:0;

  padding:0;

  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Text",
    sans-serif;

}


.wrap {

  /*
   * 留白比 v1.4 更舒适，
   * 同时保持内部滚动避免弹窗溢出。
   */

  max-height:56vh;

  overflow-y:auto;

  -webkit-overflow-scrolling:touch;

  padding:
    8px 11px 14px;

  font-size:13.5px;

  line-height:1.43;

}


.head {

  text-align:center;

  margin:
    2px 0 11px;

}


.name {

  font-size:16px;

  font-weight:700;

  line-height:1.35;

  word-break:break-word;

}


.badge {

  display:inline-block;

  margin-top:6px;

  padding:
    3px 10px;

  border-radius:8px;

  background:
    rgba(70,120,240,.12);

  color:#3970d6;

  font-size:13px;

  font-weight:700;

}


.topology {

  text-align:center;

  padding:
    4px 0 11px;

}


.place {

  margin:
    2px 0;

  font-size:14px;

  font-weight:650;

  line-height:1.4;

}


.arrow {

  margin:
    5px 0;

  color:#888;

  font-size:13px;

}


.arrow b {

  margin-left:5px;

  color:#3478f6;

  font-size:14px;

}


.section {

  border-top:
    1px solid
    rgba(128,128,128,.19);

  padding:
    9px 0 7px;

}


.section-title {

  margin-bottom:5px;

  color:#888;

  font-size:11.5px;

  font-weight:600;

}


.bgp-path {

  font-size:13.5px;

  font-weight:650;

  line-height:1.45;

  word-break:break-word;

}


.aspath {

  margin-top:4px;

  color:#888;

  font-size:10.5px;

  line-height:1.4;

  word-break:break-word;

}


.compact {

  padding-bottom:5px;

}


.row {

  display:flex;

  align-items:flex-start;

  justify-content:space-between;

  gap:14px;

  margin:
    5px 0;

}


.key {

  flex:none;

  color:#888;

  white-space:nowrap;

}


.value {

  flex:1;

  text-align:right;

  font-weight:600;

  line-height:1.4;

  word-break:break-word;

}


.note {

  margin:
    9px 3px 1px;

  color:#8a8a8a;

  text-align:center;

  font-size:10px;

  line-height:1.45;

}

</style>


<div class="wrap">


  <div class="head">

    <div class="name">

      ${escapeHtml(
        name
      )}

    </div>


    <div class="badge">

      ${escapeHtml(
        badge
      )}

    </div>

  </div>


  ${content}


</div>

`;

}


/* =========================================================
 * CACHE
 * ========================================================= */

function cacheKey(
  namespace
) {

  return (
    `qx_network_v15_${namespace}`
  );

}


function cacheGet(

  namespace,

  key,

  ttl

) {

  try {

    const raw =
      $prefs.valueForKey(

        cacheKey(
          namespace
        )

      );


    if (!raw) {

      return null;

    }


    const db =
      JSON.parse(
        raw
      );


    const item =
      db?.[key];


    if (!item) {

      return null;

    }


    if (

      Date.now() -
      item.time >
      ttl

    ) {

      return null;

    }


    return item.value;


  } catch (_) {

    return null;

  }

}


function cacheSet(

  namespace,

  key,

  value

) {

  try {

    const storage =
      cacheKey(
        namespace
      );


    let db =
      {};


    const raw =
      $prefs.valueForKey(
        storage
      );


    if (raw) {

      try {

        db =
          JSON.parse(
            raw
          );

      } catch (_) {}

    }


    db[key] = {

      time:
        Date.now(),

      value

    };


    const entries =
      Object.entries(
        db
      );


    if (
      entries.length > 60
    ) {

      entries

        .sort(
          (a, b) =>
            b[1].time -
            a[1].time
        )

        .slice(60)

        .forEach(
          item =>
            delete db[
              item[0]
            ]
        );

    }


    $prefs.setValueForKey(

      JSON.stringify(
        db
      ),

      storage

    );


  } catch (_) {}

}


/* =========================================================
 * PROMISE
 * ========================================================= */

function firstValid(

  promises,

  timeout,

  validator =
    value => !!value

) {

  return new Promise(
    resolve => {

      let ended =
        false;


      let remaining =
        promises.length;


      const timer =
        setTimeout(

          () =>
            finish(null),

          timeout

        );


      function finish(
        value
      ) {

        if (ended) {

          return;

        }


        ended =
          true;


        clearTimeout(
          timer
        );


        resolve(
          value
        );

      }


      for (
        const promise
        of promises
      ) {

        Promise
          .resolve(
            promise
          )

          .then(
            value => {

              if (

                !ended &&
                validator(value)

              ) {

                finish(
                  value
                );

                return;

              }


              remaining--;


              if (
                remaining <= 0
              ) {

                finish(null);

              }

            }
          )

          .catch(
            () => {

              remaining--;


              if (
                remaining <= 0
              ) {

                finish(null);

              }

            }
          );

      }

    }
  );

}


function withTimeout(promise, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), timeout);
    Promise.resolve(promise).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); }
    );
  });
}


/* =========================================================
 * HTTP
 * ========================================================= */

async function fetchJSON(
  request
) {

  const res =
    await withTimeout(

      $task.fetch(
        request
      ),

      CONFIG.HTTP_TIMEOUT

    );


  if (!res) {

    throw new Error(
      "HTTP EMPTY"
    );

  }


  const status =
    Number(
      res.statusCode || 0
    );


  if (
    status &&
    status >= 400
  ) {

    throw new Error(
      `HTTP ${status}`
    );

  }


  return JSON.parse(
    res.body ||
    "{}"
  );

}


/* =========================================================
 * HELPERS
 * ========================================================= */

function normalizeASN(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  const match =
    String(value).match(
      /(\d+)/
    );


  return match
    ? match[1]
    : "";

}


function validLatency(
  value
) {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;

  const n =
    Number(
      value
    );


  return (
    Number.isFinite(n) &&
    n >= 0
  )

    ? Math.round(n)

    : null;

}


function formatMs(
  value
) {

  return (
    value === null ||
    value === undefined
  )

    ? "-"

    : `${Math.round(
        value
      )} ms`;

}


function unique(
  values
) {

  return [

    ...new Set(
      values
    )

  ];

}


function uniqueAdjacent(
  values
) {

  return values.filter(

    (value, index) =>

      index === 0 ||

      value !==
        values[
          index - 1
        ]

  );

}


function normalizeCountry(
  value
) {

  return String(
    value || ""
  )

    .trim()

    .toUpperCase();

}


function normalizeIP(
  value
) {

  return stripIPv6Brackets(

    String(
      value || ""
    )

  ).toLowerCase();

}


function stripIPv6Brackets(
  value
) {

  return String(
    value || ""
  )

    .replace(
      /^\[/,
      ""
    )

    .replace(
      /\]$/,
      ""
    );

}


function isIPv4(
  ip
) {

  const parts =
    String(
      ip || ""
    ).split(".");


  return (

    parts.length === 4 &&

    parts.every(
      part =>

        /^\d+$/.test(
          part
        ) &&

        Number(part) >= 0 &&

        Number(part) <= 255

    )

  );

}


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


function isIP(
  ip
) {

  return (
    isIPv4(ip) ||
    isIPv6(ip)
  );

}


function flag(
  code
) {

  code =
    normalizeCountry(
      code
    );


  if (
    !/^[A-Z]{2}$/.test(
      code
    )
  ) {

    return "";

  }


  return String.fromCodePoint(

    ...code

      .split("")

      .map(
        char =>
          127397 +
          char.charCodeAt(0)
      )

  );

}


function escapeHtml(
  value
) {

  return String(
    value ?? ""
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
    )

    .replace(
      /'/g,
      "&#39;"
    );

}


function debug(
  label,
  value
) {

  if (
    !CONFIG.DEBUG
  ) {

    return;

  }


  console.log(

    `[NetworkAnalyzer 1.5] ${label}: ` +

    JSON.stringify(
      value
    )

  );

}