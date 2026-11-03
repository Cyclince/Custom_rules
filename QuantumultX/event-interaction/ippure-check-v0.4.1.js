## IPPure 查询脚本，制作 by 翀𝙡𝙧 TG：https://t.me/chong_redaily
## 更新时间：2026-11-03
## 功能简介：并发探测 IPv4、IPv6 和默认出口，展示位置、ISP、ASN、网络类型及 IP 风险评分。

/***

[task_local]
event-interaction server-info-pure-dual.js, tag=节点详情(Pure+), img-url=checkmark.shield.fill.system

@Description:
基于 IPPure 的节点双栈检测
- IPv4 / IPv6 / Dual Stack
- 默认协议优先级
- ISP / ASN / 位置
- 住宅 / 数据中心 / 原生 / 广播
- IPPure / IPQuery 风险
- 全并发检测
- 全局硬截止时间
- 紧凑型原版 UI

@Version: 0.4
@Update: 2026-09-30

***/


const POLICY = typeof $environment !== "undefined" ? ($environment.params || "") : "";

const START_TIME = Date.now();


/* =========================================================
 * 性能参数
 *
 * 单接口 timeout：
 * 防止正常的失败请求长期等待
 *
 * TOTAL：
 * 整个脚本硬截止时间
 * 即使某个 API timeout 行为异常，也不会无限等待
 * ======================================================= */

const TIMEOUT = {
    PURE: 1800,
    PROBE: 1300,
    AUTO: 1200,
    DETAIL: 1200
};

const TOTAL_DEADLINE = 2800;


const UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
    "Version/18.0 Mobile/15E148 Safari/604.1";


/* =========================================================
 * API
 * ======================================================= */

const API = {

    PURE:
        "https://my.ippure.com/v1/info",

    IPV4: [
        "https://4.ipw.cn",
        "https://api.ipify.org?format=json"
    ],

    IPV6: [
        "https://6.ipw.cn",
        "https://api6.ipify.org?format=json"
    ],

    AUTO: [
        "https://test.ipw.cn",
        "https://api64.ipify.org?format=json"
    ],

    IPQUERY:
        "https://api.ipquery.io/"
};


/* =========================================================
 * 全局状态
 *
 * 所有请求完成后写入这里。
 * 到达 TOTAL_DEADLINE 时直接读取已有结果。
 * ======================================================= */

const STATE = {

    pure: null,

    ipv4: "",
    ipv6: "",
    auto: "",

    q4: null,
    q6: null
};


let FINISHED = false;


/* =========================================================
 * HTTP
 * ======================================================= */

function requestText(url, timeout) {

    return $task.fetch({

        url: url,

        headers: {

            "User-Agent": UA,

            "Accept":
                "application/json,text/plain,*/*",

            "Cache-Control":
                "no-cache"
        },

        opts: {
            ...(POLICY ? { policy: POLICY } : {})
        },

        timeout: timeout

    })

    .then(

        function (response) {

            const status =
                Number(
                    response.statusCode ||
                    200
                );


            if (
                status < 200 ||
                status >= 400
            ) {

                return null;
            }


            if (
                response.body === undefined ||
                response.body === null
            ) {

                return null;
            }


            return String(
                response.body
            ).trim();
        },

        function () {

            return null;
        }
    );
}


function requestJSON(url, timeout) {

    return requestText(
        url,
        timeout
    )

    .then(

        function (text) {

            if (!text) {

                return null;
            }


            try {

                return JSON.parse(text);

            } catch (e) {

                return null;
            }
        }
    );
}


/* =========================================================
 * TIMER
 * ======================================================= */

function sleep(ms) {

    return new Promise(

        function (resolve) {

            setTimeout(
                resolve,
                ms
            );
        }
    );
}


/* =========================================================
 * IPv4
 * ======================================================= */

function isIPv4(ip) {

    if (
        !ip ||
        typeof ip !== "string"
    ) {

        return false;
    }


    const parts =
        ip.trim().split(".");


    if (
        parts.length !== 4
    ) {

        return false;
    }


    return parts.every(

        function (part) {

            if (
                !/^\d+$/.test(part)
            ) {

                return false;
            }


            const value =
                Number(part);


            return (
                value >= 0 &&
                value <= 255
            );
        }
    );
}


/* =========================================================
 * IPv6
 * ======================================================= */

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


function getFamily(ip) {

    if (isIPv4(ip)) {

        return 4;
    }


    if (isIPv6(ip)) {

        return 6;
    }


    return 0;
}


/* =========================================================
 * Parse IP
 * ======================================================= */

function parseIP(text) {

    if (!text) {

        return "";
    }


    let value =
        String(text).trim();


    /*
     * JSON
     */

    if (
        value.charAt(0) === "{"
    ) {

        try {

            const data =
                JSON.parse(value);


            if (
                data &&
                data.ip
            ) {

                value =
                    String(
                        data.ip
                    ).trim();
            }

        } catch (e) {}
    }


    /*
     * 直接 IP
     */

    if (
        isIPv4(value) ||
        isIPv6(value)
    ) {

        return value;
    }


    /*
     * IPv4 in text
     */

    const ipv4List =
        value.match(
            /(?:\d{1,3}\.){3}\d{1,3}/g
        );


    if (ipv4List) {

        for (
            let i = 0;
            i < ipv4List.length;
            i++
        ) {

            if (
                isIPv4(
                    ipv4List[i]
                )
            ) {

                return ipv4List[i];
            }
        }
    }


    /*
     * IPv6 in text
     */

    const tokens =
        value
            .replace(
                /[\[\]\(\),;"']/g,
                " "
            )
            .split(/\s+/);


    for (
        let i = 0;
        i < tokens.length;
        i++
    ) {

        if (
            isIPv6(
                tokens[i]
            )
        ) {

            return tokens[i];
        }
    }


    return "";
}


/* =========================================================
 * 双 API 抢答
 *
 * 两个源一起请求。
 *
 * 有任何一个获得有效 IP，
 * 立即 resolve。
 *
 * 一个源慢不会拖住另一个源。
 * ======================================================= */

function firstValidIP(
    urls,
    timeout,
    wantedFamily
) {

    return new Promise(

        function (resolve) {

            let remaining =
                urls.length;


            let resolved =
                false;


            if (!remaining) {

                resolve("");

                return;
            }


            urls.forEach(

                function (url) {

                    requestText(
                        url,
                        timeout
                    )

                    .then(

                        function (text) {

                            if (resolved) {

                                return;
                            }


                            const ip =
                                parseIP(text);


                            if (ip && (!wantedFamily || getFamily(ip) === wantedFamily)) {

                                resolved = true;

                                resolve(ip);

                                return;
                            }


                            remaining--;


                            if (
                                remaining <= 0 &&
                                !resolved
                            ) {

                                resolved = true;

                                resolve("");
                            }
                        }
                    );
                }
            );
        }
    );
}


/* =========================================================
 * HTML
 * ======================================================= */

function escapeHTML(value) {

    return String(
        value === undefined ||
        value === null
            ? ""
            : value
    )

    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


/* =========================================================
 * Flag
 * ======================================================= */

function getFlagEmoji(code) {

    if (
        !code ||
        !/^[A-Za-z]{2}$/.test(code)
    ) {

        return "🌍";
    }


    return String.fromCodePoint(

        ...code
            .toUpperCase()
            .split("")
            .map(

                function (char) {

                    return (
                        127397 +
                        char.charCodeAt()
                    );
                }
            )
    );
}


/* =========================================================
 * ASN
 * ======================================================= */

function normalizeASN(asn) {

    if (
        asn === null ||
        asn === undefined ||
        asn === ""
    ) {

        return "N/A";
    }


    const value =
        String(asn).toUpperCase();


    if (
        value === "AS0" ||
        value === "0"
    ) {

        return "N/A";
    }


    return (
        value.indexOf("AS") === 0
            ? value
            : "AS" + value
    );
}


/* =========================================================
 * IPPure Match
 * ======================================================= */

function pureMatch(
    ip,
    pure
) {

    return Boolean(

        ip &&
        pure &&
        pure.ip &&

        String(ip).toLowerCase() ===
        String(pure.ip).toLowerCase()
    );
}


/* =========================================================
 * ISP
 * ======================================================= */

function getISP(
    ip,
    query,
    pure
) {

    /*
     * IPPure 元数据优先
     *
     * IPv4 / IPv6 都可以使用
     */

    if (
        pureMatch(
            ip,
            pure
        ) &&
        pure.asOrganization
    ) {

        return pure.asOrganization;
    }


    if (
        query &&
        query.isp
    ) {

        return (
            query.isp.isp ||
            query.isp.org ||
            "N/A"
        );
    }


    return "N/A";
}


/* =========================================================
 * ASN
 * ======================================================= */

function getASN(
    ip,
    query,
    pure
) {

    if (
        pureMatch(
            ip,
            pure
        ) &&
        pure.asn
    ) {

        return normalizeASN(
            pure.asn
        );
    }


    if (
        query &&
        query.isp
    ) {

        return normalizeASN(
            query.isp.asn
        );
    }


    return "N/A";
}


/* =========================================================
 * Location
 * ======================================================= */

function getLocation(
    ip,
    query,
    pure
) {

    let cc = "";
    let region = "";
    let city = "";


    /*
     * IPPure 优先
     */

    if (
        pureMatch(
            ip,
            pure
        )
    ) {

        cc =
            pure.countryCode || "";

        region =
            pure.region || "";

        city =
            pure.city || "";
    }


    /*
     * IPQuery fallback
     */

    else if (
        query &&
        query.location
    ) {

        cc =
            query.location.country_code || "";

        region =
            query.location.state || "";

        city =
            query.location.city || "";
    }


    if (
        !cc &&
        !region &&
        !city
    ) {

        return "N/A";
    }


    let result =
        getFlagEmoji(cc);


    if (cc) {

        result +=
            " " +
            cc;
    }


    if (
        region &&
        region !== city
    ) {

        result +=
            " · " +
            region;
    }


    if (city) {

        result +=
            " · " +
            city;
    }


    return result;
}


/* =========================================================
 * TYPE
 * ======================================================= */

function getType(
    ip,
    query,
    pure
) {

    const result = [];


    /*
     * IPPure 信息优先
     */

    if (
        pureMatch(
            ip,
            pure
        )
    ) {

        if (
            pure.isResidential === true
        ) {

            result.push(
                "住宅网络 🏠"
            );
        }


        else if (
            pure.isResidential === false
        ) {

            result.push(
                "数据中心 🏢"
            );
        }


        if (
            pure.isBroadcast === true
        ) {

            result.push(
                "广播 IP 📡"
            );
        }


        else if (
            pure.isBroadcast === false
        ) {

            result.push(
                "原生 IP 🌐"
            );
        }
    }


    /*
     * IPQuery fallback
     */

    else if (
        query &&
        query.risk
    ) {

        if (
            query.risk.is_mobile
        ) {

            result.push(
                "移动网络 📱"
            );
        }


        else if (
            query.risk.is_datacenter
        ) {

            result.push(
                "数据中心 🏢"
            );
        }


        else {

            result.push(
                "ISP 网络 🌐"
            );
        }
    }


    return (
        result.length
            ? result.join(" · ")
            : "未知"
    );
}


/* =========================================================
 * Risk
 * ======================================================= */

function validRiskScore(value) {
    return (typeof value === "number" || typeof value === "string") &&
        String(value).trim() !== "" && Number.isFinite(Number(value)) &&
        Number(value) >= 0 && Number(value) <= 100;
}

function getRiskData(
    ip,
    query,
    pure
) {

    /*
     * IPv4：
     * IPPure fraudScore 最优先
     */

    if (
        getFamily(ip) === 4 &&
        pureMatch(
            ip,
            pure
        ) &&
        pure.fraudScore !== null &&
        pure.fraudScore !== undefined &&
        validRiskScore(pure.fraudScore)
    ) {

        return {

            score:
                Number(
                    pure.fraudScore
                ),

            source:
                "IPPure"
        };
    }


    /*
     * IPv6 / IPPure 未命中：
     * 使用 IPQuery
     */

    if (
        query &&
        query.risk &&
        query.risk.risk_score !== null &&
        query.risk.risk_score !== undefined &&
        validRiskScore(query.risk.risk_score)
    ) {

        return {

            score:
                Number(
                    query.risk.risk_score
                ),

            source:
                "IPQuery"
        };
    }


    return {

        score: null,

        source: ""
    };
}


/* =========================================================
 * Risk level
 * ======================================================= */

function getRiskLevel(score) {

    if (
        score === null ||
        score === undefined ||
        isNaN(Number(score))
    ) {

        return (
            "<font color='#8e8e93'>" +
            "暂无评分" +
            "</font>"
        );
    }


    score =
        Number(score);


    if (
        score <= 25
    ) {

        return (
            "<font color='#34c759'>" +
            "低风险 ✅" +
            "</font>"
        );
    }


    if (
        score <= 50
    ) {

        return (
            "<font color='#d5a000'>" +
            "中风险 🟡" +
            "</font>"
        );
    }


    if (
        score <= 75
    ) {

        return (
            "<font color='#ff9500'>" +
            "高风险 ⚠️" +
            "</font>"
        );
    }


    return (
        "<font color='#ff3b30'>" +
        "极高风险 ‼️" +
        "</font>"
    );
}


/* =========================================================
 * Purity
 * ======================================================= */

function getPurity(score) {

    if (
        score === null ||
        score === undefined ||
        isNaN(Number(score))
    ) {

        return "N/A";
    }


    score =
        Math.max(
            0,
            Math.min(
                100,
                Number(score)
            )
        );


    return (
        (100 - score) +
        " / 100"
    );
}


/* =========================================================
 * Risk flags
 *
 * 正常节点不显示。
 * ======================================================= */

function getRiskFlags(query) {

    if (
        !query ||
        !query.risk
    ) {

        return "";
    }


    const result = [];


    if (
        query.risk.is_vpn
    ) {

        result.push("VPN");
    }


    if (
        query.risk.is_proxy
    ) {

        result.push("Proxy");
    }


    if (
        query.risk.is_tor
    ) {

        result.push("Tor");
    }


    return result.join(" / ");
}


/* =========================================================
 * UI row
 *
 * 回归原来的：
 *
 * 字段：值
 *
 * 而不是左右两端布局。
 * ======================================================= */

function row(
    key,
    value
) {

    return (

        `<span class="key">` +
        escapeHTML(key) +
        "：</span>" +

        `<span class="value">` +
        escapeHTML(value) +
        `</span><br/>`
    );
}


function rawRow(
    key,
    value
) {

    return (

        `<span class="key">` +
        escapeHTML(key) +
        "：</span>" +

        `<span class="value">` +
        value +
        `</span><br/>`
    );
}


/* =========================================================
 * IP Section
 * ======================================================= */

function generateIPSection(
    title,
    ip,
    query,
    pure
) {

    let html =

        `<div class="section-title">` +
        escapeHTML(title) +
        `</div>`;


    if (!ip) {

        html +=
            row(
                "状态",
                "未探测到"
            );


        return html;
    }


    const risk =
        getRiskData(
            ip,
            query,
            pure
        );


    html +=
        row(
            "IP",
            ip
        );


    html +=
        row(
            "ISP",
            getISP(
                ip,
                query,
                pure
            )
        );


    html +=
        row(
            "ASN",
            getASN(
                ip,
                query,
                pure
            )
        );


    html +=
        row(
            "位置",
            getLocation(
                ip,
                query,
                pure
            )
        );


    html +=
        row(
            "类型",
            getType(
                ip,
                query,
                pure
            )
        );


    html +=
        row(
            "纯净度",
            getPurity(
                risk.score
            )
        );


    let riskText =
        getRiskLevel(
            risk.score
        );


    if (
        risk.score !== null
    ) {

        riskText +=

            " · " +
            risk.score;


        if (risk.source) {

            riskText +=

                " · " +
                escapeHTML(
                    risk.source
                );
        }
    }


    html +=
        rawRow(
            "风险",
            riskText
        );


    /*
     * VPN / Proxy / Tor
     * 只有异常时才显示
     */

    const flags =
        getRiskFlags(
            query
        );


    if (flags) {

        html +=
            rawRow(

                "风险特征",

                `<font color="#ff9500">` +
                escapeHTML(flags) +
                `</font>`
            );
    }


    return html;
}


/* =========================================================
 * 启动全部核心请求
 * ======================================================= */

const purePromise =

    requestJSON(
        API.PURE,
        TIMEOUT.PURE
    )

    .then(

        function (data) {

            STATE.pure =
                data;

            return data;
        }
    );


const ipv4Promise =

    firstValidIP(
        API.IPV4,
        TIMEOUT.PROBE,
        4
    )

    .then(

        function (ip) {

            STATE.ipv4 =
                ip || "";


            /*
             * IPv4 一拿到，
             * 立即开始 IPQuery。
             */

            if (ip) {

                return requestJSON(

                    API.IPQUERY +
                    encodeURIComponent(ip),

                    TIMEOUT.DETAIL
                )

                .then(

                    function (data) {

                        STATE.q4 =
                            data;

                        return ip;
                    }
                );
            }


            return ip;
        }
    );


const ipv6Promise =

    firstValidIP(
        API.IPV6,
        TIMEOUT.PROBE,
        6
    )

    .then(

        function (ip) {

            STATE.ipv6 =
                ip || "";


            /*
             * IPv6 一拿到，
             * 立即开始 IPQuery。
             */

            if (ip) {

                return requestJSON(

                    API.IPQUERY +
                    encodeURIComponent(ip),

                    TIMEOUT.DETAIL
                )

                .then(

                    function (data) {

                        STATE.q6 =
                            data;

                        return ip;
                    }
                );
            }


            return ip;
        }
    );


const autoPromise =

    firstValidIP(
        API.AUTO,
        TIMEOUT.AUTO
    )

    .then(

        function (ip) {

            STATE.auto =
                ip || "";

            return ip;
        }
    );


/* =========================================================
 * 全局任务
 *
 * 两种情况：
 *
 * 1. 全部请求很快完成
 *    → 立即弹窗
 *
 * 2. 某个第三方接口卡住
 *    → TOTAL_DEADLINE 到达
 *    → 强制使用已有数据
 * ======================================================= */

Promise.race([

    Promise.all([

        purePromise,

        ipv4Promise,

        ipv6Promise,

        autoPromise
    ]),

    sleep(
        TOTAL_DEADLINE
    )

])

.then(

    function () {

        showResult();
    }
)

.catch(

    function (error) {

        console.log(
            "ERROR: " +
            String(error)
        );


        showResult();
    }
);


/* =========================================================
 * Result
 * ======================================================= */

function showResult() {

    if (FINISHED) {

        return;
    }


    FINISHED = true;


    let pure =
        STATE.pure;


    let ipv4 =
        STATE.ipv4;


    let ipv6 =
        STATE.ipv6;


    let autoIP =
        STATE.auto;


    const q4 =
        STATE.q4;


    const q6 =
        STATE.q6;


    /* =====================================================
     * IPPure fallback
     *
     * 如果 IP probe 没识别出来，
     * 但 IPPure 已经拿到 IP，
     * 则补回对应协议。
     *
     * 不再因此发起新的 API 查询。
     * =================================================== */

    if (
        pure &&
        pure.ip
    ) {

        const pureIP =
            String(
                pure.ip
            ).trim();


        if (
            isIPv4(pureIP) &&
            !ipv4
        ) {

            ipv4 =
                pureIP;
        }


        if (
            isIPv6(pureIP) &&
            !ipv6
        ) {

            ipv6 =
                pureIP;
        }
    }


    /* =====================================================
     * Stack
     * =================================================== */

    let stack =
        "未检测到有效出口";


    if (
        ipv4 &&
        ipv6
    ) {

        stack =
            "IPv4 + IPv6 双栈";
    }


    else if (ipv4) {

        stack =
            "IPv4 Only";
    }


    else if (ipv6) {

        stack =
            "IPv6 Only";
    }


    /* =====================================================
     * Preference
     *
     * AUTO 优先
     *
     * AUTO 挂掉时，
     * IPPure 实际使用的出口作为 fallback。
     * =================================================== */

    let preference =
        "无法判断";


    let preferenceIP =
        autoIP;


    if (
        !preferenceIP &&
        pure &&
        pure.ip
    ) {

        preferenceIP =
            String(
                pure.ip
            );
    }


    if (
        ipv4 &&
        ipv6
    ) {

        if (
            getFamily(
                preferenceIP
            ) === 4
        ) {

            preference =
                "IPv4 优先";
        }


        else if (
            getFamily(
                preferenceIP
            ) === 6
        ) {

            preference =
                "IPv6 优先";
        }
    }


    else if (ipv4) {

        preference =
            "IPv4 Only";
    }


    else if (ipv6) {

        preference =
            "IPv6 Only";
    }


    /* =====================================================
     * 默认出口
     * =================================================== */

    let defaultIP =
        autoIP;


    if (
        !defaultIP &&
        pure &&
        pure.ip
    ) {

        defaultIP =
            String(
                pure.ip
            );
    }


    const elapsed =
        Date.now() -
        START_TIME;


    /* =====================================================
     * HTML
     *
     * 回归原版 HTML 风格：
     *
     * - 全部居中
     * - 字段和值保持同行
     * - 不使用左右分栏
     * - 不使用卡片
     * - 压缩行距 / 分隔距离
     * =================================================== */

    let html = `

<style>

.wrap {

    text-align: center;

    font-family:
        -apple-system,
        BlinkMacSystemFont,
        "SF Pro Text",
        sans-serif;

    font-size: 14px;

    line-height: 1.28;
}


.sep {

    margin:
        5px 0;

    border: 0;

    border-top:
        1px solid
        rgba(
            142,
            142,
            147,
            .32
        );
}


.network-title {

    color: #6959CD;

    font-weight: 700;

    font-size: 15px;

    margin-bottom: 1px;
}


.section-title {

    color: #6959CD;

    font-weight: 700;

    font-size: 15px;

    margin:
        1px 0 2px;
}


.key {

    color: #8e8e93;

    font-weight: 700;
}


.value {

    font-weight: 500;

    overflow-wrap: anywhere;
}


.node {

    color: #6959CD;

    font-weight: 600;

    margin-top: 1px;
}


.time {

    color: #8e8e93;

    font-size: 11px;

    margin-top: 1px;
}

</style>


<div class="wrap">

<hr class="sep"/>


<div class="network-title">
🌐 网络状态
</div>

${row(
    "协议栈",
    stack
)}

${row(
    "优先访问",
    preference
)}

${
    defaultIP

    ? row(
        "默认出口",
        defaultIP
    )

    : ""
}


<hr class="sep"/>


${generateIPSection(
    "IPv4",
    ipv4,
    q4,
    pure
)}


<hr class="sep"/>


${generateIPSection(
    "IPv6",
    ipv6,
    q6,
    pure
)}


<hr class="sep"/>


<div class="node">

节点 ➟ ${escapeHTML(POLICY)}

</div>


<div class="time">

查询耗时 ${elapsed} ms

</div>


</div>

`;


    /* =====================================================
     * Log
     * =================================================== */

    console.log(

        "\n===== IPPure Dual Stack V0.4 =====" +

        "\n节点: " +
        POLICY +

        "\nIPv4: " +
        (ipv4 || "N/A") +

        "\nIPv6: " +
        (ipv6 || "N/A") +

        "\nAUTO: " +
        (
            autoIP ||
            "N/A"
        ) +

        "\nIPPure: " +
        (
            pure &&
            pure.ip
                ? pure.ip
                : "N/A"
        ) +

        "\n协议: " +
        stack +

        "\n优先: " +
        preference +

        "\n耗时: " +
        elapsed +
        " ms"
    );


    $done({

        title:
            "🔎 IPPure 节点详情+",

        htmlMessage:
            html
    });
}