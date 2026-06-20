// Config_for_OpenClash -> Mihomo/SubStore/Clash Party JavaScript override
// Converted from 翀𝙡𝙧 OpenClash Subconverter template, Update Time 2026.06.20
// Reference style: powerfullz/override-rules convert.min.js dynamic override.

const RULE_PROVIDERS = {
  "Custom_Direct_Domain": {
    "type": "http",
    "behavior": "domain",
    "format": "yaml",
    "interval": 28800,
    "url": "https://api.asailor.org/Custom_OpenClash_Rules/main/rule/Custom_Direct_Domain.yaml",
    "path": "./ruleset/Custom_Direct_Domain.yaml"
  },
  "Custom_Direct_Classical_IP": {
    "type": "http",
    "behavior": "classical",
    "format": "yaml",
    "interval": 28800,
    "url": "https://api.asailor.org/Custom_OpenClash_Rules/main/rule/Custom_Direct_Classical_IP.yaml",
    "path": "./ruleset/Custom_Direct_Classical_IP.yaml"
  },
  "Custom_Proxy_Domain": {
    "type": "http",
    "behavior": "domain",
    "format": "yaml",
    "interval": 28800,
    "url": "https://api.asailor.org/Custom_OpenClash_Rules/main/rule/Custom_Proxy_Domain.yaml",
    "path": "./ruleset/Custom_Proxy_Domain.yaml"
  },
  "Custom_Proxy_Classical_IP": {
    "type": "http",
    "behavior": "classical",
    "format": "yaml",
    "interval": 28800,
    "url": "https://api.asailor.org/Custom_OpenClash_Rules/main/rule/Custom_Proxy_Classical_IP.yaml",
    "path": "./ruleset/Custom_Proxy_Classical_IP.yaml"
  },
  "SpeedtestInternational": {
    "type": "http",
    "behavior": "classical",
    "format": "yaml",
    "interval": 28800,
    "url": "https://kelee.one/Tool/Clash/Rule/SpeedtestInternational.yaml",
    "path": "./ruleset/SpeedtestInternational.yaml"
  },
  "Custom_Port_Direct": {
    "type": "http",
    "behavior": "classical",
    "format": "yaml",
    "interval": 28800,
    "url": "https://api.asailor.org/Custom_OpenClash_Rules/main/rule/Custom_Port_Direct.yaml",
    "path": "./ruleset/Custom_Port_Direct.yaml"
  }
};
const PROXY_GROUPS = [
  {
    "name": "🚀 全球加速",
    "type": "select",
    "proxies": [
      "♻️ 自动选择",
      "📌 手动选择",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点",
      "🎯 全球直连"
    ],
    "include-all": true
  },
  {
    "name": "🎯 全球直连",
    "type": "select",
    "proxies": [
      "DIRECT"
    ]
  },
  {
    "name": "📌 手动选择",
    "type": "select",
    "proxies": [
      "♻️ 自动选择",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点",
      "🎯 全球直连"
    ],
    "include-all": true
  },
  {
    "name": "♻️ 自动选择",
    "type": "url-test",
    "include-all": true,
    "filter": "(^(?!.*(?:网易|墨鱼)).*)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🤖 AI服务",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🇺🇸 美国节点",
      "🇸🇬 新加坡节点",
      "🇯🇵 日本节点",
      "🇭🇰 香港节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🐱 Github",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点",
      "🎯 全球直连"
    ],
    "include-all": true
  },
  {
    "name": "💬 即时通信",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🌐 社交媒体",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🍎 苹果服务",
    "type": "select",
    "proxies": [
      "🎯 全球直连",
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "Ⓜ️ 微软服务",
    "type": "select",
    "proxies": [
      "🎯 全球直连",
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🇬 谷歌服务",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "📢 谷歌FCM",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🎯 全球直连",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🎬 Emby",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🎯 全球直连",
      "🇹🇼 台湾节点",
      "🇯🇵 日本节点",
      "🇭🇰 香港节点",
      "🇸🇬 新加坡节点",
      "🇺🇸 美国节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "📽️ YouTube",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🎥 Netflix",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇸🇬 新加坡节点",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "📺 Bahamut",
    "type": "select",
    "proxies": [
      "🇹🇼 台湾节点",
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🎯 全球直连"
    ],
    "include-all": true
  },
  {
    "name": "📹 流媒体服务",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇸🇬 新加坡节点",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🌎 国外媒体",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "👾 Steam社区",
    "type": "select",
    "proxies": [
      "🎯 全球直连",
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🎮 游戏平台",
    "type": "select",
    "proxies": [
      "🎯 全球直连",
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "📊 测速工具",
    "type": "select",
    "proxies": [
      "🎯 全球直连",
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🐟 漏网之鱼",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "⏬ PT站点",
    "type": "select",
    "proxies": [
      "🎯 全球直连",
      "📌 手动选择",
      "♻️ 自动选择",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🔀 非标端口",
    "type": "select",
    "proxies": [
      "🐟 漏网之鱼",
      "🎯 全球直连",
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速"
    ],
    "include-all": true
  },
  {
    "name": "🐟 漏网之鱼",
    "type": "select",
    "proxies": [
      "📌 手动选择",
      "♻️ 自动选择",
      "🚀 全球加速",
      "🎯 全球直连",
      "🇭🇰 香港节点",
      "🇺🇸 美国节点",
      "🇯🇵 日本节点",
      "🇸🇬 新加坡节点",
      "🇹🇼 台湾节点",
      "🇰🇷 韩国节点",
      "🇨🇦 加拿大节点",
      "🇬🇧 英国节点",
      "🇫🇷 法国节点",
      "🇩🇪 德国节点",
      "🇳🇱 荷兰节点",
      "🇹🇷 土耳其节点",
      "🇷🇺 俄罗斯节点",
      "🌐 其他地区",
      "🏠 家宽节点",
      "🐢 低倍率节点"
    ],
    "include-all": true
  },
  {
    "name": "🇭🇰 香港节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇺🇸 美国节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇯🇵 日本节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇸🇬 新加坡节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇹🇼 台湾节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇰🇷 韩国节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇨🇦 加拿大节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇨🇦|加拿大|\\bCA(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Canada|CANADA|CAN|渥太华|温哥华|卡尔加里|蒙特利尔|Montreal|YVR|YYZ|YUL)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇬🇧 英国节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇬🇧|英国|Britain|United Kingdom|UNITED KINGDOM|England|伦敦|曼彻斯特|Manchester|\\bUK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|GBR|LHR|MAN)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇫🇷 法国节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇫🇷|法国|\\bFR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|France|FRANCE|FRA|巴黎|马赛|Marseille|CDG|MRS)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇩🇪 德国节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇩🇪|德国|Germany|GERMANY|\\bDE(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|DEU|柏林|法兰克福|慕尼黑|Munich|MUC)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇳🇱 荷兰节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇳🇱|荷兰|Netherlands|NETHERLANDS|\\bNL(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|NLD|阿姆斯特丹|AMS)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇹🇷 土耳其节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇹🇷|土耳其|Turkey|TURKEY|Türkiye|\\bTR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|TUR|IST|ANK)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🇷🇺 俄罗斯节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(🇷🇺|(?<!白)俄罗斯|(?<!白)俄|莫斯科|圣彼得堡|新西伯利亚|海参崴|符拉迪沃斯托克|哈巴罗夫斯克|伯力|\\bRU(?:[-_ ]?\\d+)?\\b|Russia)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🌐 其他地区",
    "type": "url-test",
    "include-all": true,
    "filter": "(^(?!.*(港|HK|Hong Kong|HKG|🇭🇰|美|US|USA|America|🇺🇸|日本|JP|Japan|🇯🇵|新加坡|SG|Singapore|🇸🇬|台|TW|Taiwan|🇹🇼|韩国|KR|Korea|🇰🇷|加拿大|CA|Canada|🇨🇦|英国|UK|GBR|Britain|🇬🇧|法国|FR|France|🇫🇷|德国|DE|Germany|🇩🇪|荷兰|NL|Netherlands|🇳🇱|土耳其|TR|Turkey|🇹🇷|俄罗斯|RU|Russia|🇷🇺|家宽|住宅|Residential|低倍率|低倍)).*)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🏠 家宽节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(家宽|家庭宽带|住宅|Residential)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  },
  {
    "name": "🐢 低倍率节点",
    "type": "url-test",
    "include-all": true,
    "filter": "(低倍率|低倍|(?<![\\d\\.])0?\\.\\d+(?![0-9])(?:x|倍)?|倍率[:： ]?0?\\.\\d+)",
    "url": "https://cp.cloudflare.com/generate_204",
    "interval": 300,
    "tolerance": 50
  }
];
const RULES = [
  "GEOSITE,private,🎯 全球直连",
  "GEOIP,private,🎯 全球直连,no-resolve",
  "GEOSITE,google-cn,🎯 全球直连",
  "GEOSITE,category-games@cn,🎯 全球直连",
  "GEOSITE,category-game-platforms-download,🎯 全球直连",
  "GEOSITE,category-public-tracker,🎯 全球直连",
  "RULE-SET,Custom_Direct_Domain,🎯 全球直连",
  "RULE-SET,Custom_Direct_Classical_IP,🎯 全球直连",
  "GEOSITE,category-ai-!cn,🤖 AI服务",
  "RULE-SET,Custom_Proxy_Domain,📌 手动选择",
  "RULE-SET,Custom_Proxy_Classical_IP,📌 手动选择",
  "GEOSITE,github,🐱 Github",
  "GEOSITE,category-communication,💬 即时通信",
  "GEOSITE,telegram,💬 即时通信",
  "GEOIP,telegram,💬 即时通信,no-resolve",
  "GEOSITE,category-social-media-!cn,🌐 社交媒体",
  "GEOIP,twitter,🌐 社交媒体,no-resolve",
  "GEOIP,facebook,🌐 社交媒体,no-resolve",
  "GEOSITE,youtube,📽️ YouTube",
  "GEOSITE,netflix,🎥 Netflix",
  "GEOIP,netflix,🎥 Netflix,no-resolve",
  "GEOSITE,bahamut,📺 Bahamut",
  "GEOSITE,category-entertainment,📹 流媒体服务",
  "GEOSITE,steam,👾 Steam社区",
  "GEOSITE,category-games-!cn,🎮 游戏平台",
  "GEOSITE,apple,🍎 苹果服务",
  "GEOSITE,onedrive,Ⓜ️ 微软服务",
  "GEOSITE,microsoft,Ⓜ️ 微软服务",
  "GEOSITE,googlefcm,📢 谷歌FCM",
  "GEOSITE,google,🇬 谷歌服务",
  "GEOIP,google,🇬 谷歌服务,no-resolve",
  "GEOSITE,category-emby,🎬 Emby",
  "GEOSITE,category-media,🌎 国外媒体",
  "GEOSITE,category-tech-media,🌎 国外媒体",
  "GEOSITE,category-finance,🚀 全球加速",
  "GEOSITE,category-ecommerce,🚀 全球加速",
  "GEOSITE,category-scholar-!cn,🚀 全球加速",
  "GEOSITE,category-speedtest,📊 测速工具",
  "RULE-SET,SpeedtestInternational,📊 测速工具",
  "GEOSITE,category-pt,⏬ PT站点",
  "RULE-SET,Custom_Port_Direct,🔀 非标端口",
  "GEOSITE,cn,🎯 全球直连",
  "GEOIP,cn,🎯 全球直连,no-resolve",
  "GEOSITE,gfw,🚀 全球加速",
  "MATCH,🐟 漏网之鱼"
];

function applyCustomOverride(config) {
  config = config || {};
  config["rule-providers"] = Object.assign({}, config["rule-providers"] || {}, RULE_PROVIDERS);
  config["proxy-groups"] = PROXY_GROUPS.map((group) => Object.assign({}, group));
  config.rules = RULES.slice();
  return config;
}

// Clash Party / Mihomo Party style
function main(config) {
  return applyCustomOverride(config);
}

// SubStore / generic operator fallback
function operator(config) {
  return applyCustomOverride(config);
}

if (typeof module !== "undefined") {
  module.exports = { main, operator };
}
