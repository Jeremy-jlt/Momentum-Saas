const BLOCKED_SITES_MAP = {
  Instagram: ['instagram.com'],
  TikTok: ['tiktok.com'],
  'X / Twitter': ['x.com', 'twitter.com'],
  Facebook: ['facebook.com'],
  Snapchat: ['snapchat.com'],
  Threads: ['threads.net'],
  Reddit: ['reddit.com'],
  Pinterest: ['pinterest.com'],
  YouTube: ['youtube.com'],
  Netflix: ['netflix.com'],
  Twitch: ['twitch.tv'],
  'Disney+': ['disneyplus.com'],
  'Prime Video': ['primevideo.com'],
  Dailymotion: ['dailymotion.com'],
  'Le Monde': ['lemonde.fr'],
  BFMTV: ['bfmtv.com'],
  "L'Équipe": ['lequipe.fr'],
  Amazon: ['amazon.fr', 'amazon.com'],
  Vinted: ['vinted.fr'],
  Shein: ['shein.com'],
  AliExpress: ['aliexpress.com'],
  Cdiscount: ['cdiscount.com'],
  Poki: ['poki.com'],
  'itch.io': ['itch.io'],
  Discord: ['discord.com'],
  Messenger: ['messenger.com'],
  'WhatsApp Web': ['web.whatsapp.com'],
}

function domainsForLabels(labels) {
  const domains = []
  for (const label of labels) {
    if (BLOCKED_SITES_MAP[label]) {
      domains.push(...BLOCKED_SITES_MAP[label])
    } else if (typeof label === 'string' && label.includes('.')) {
      // site personnalisé : on suppose que le label est déjà un domaine
      domains.push(label.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    }
  }
  return [...new Set(domains)]
}

function allDomains() {
  return [...new Set(Object.values(BLOCKED_SITES_MAP).flat())]
}

// eslint-disable-next-line no-unused-vars
const MomentumBlockedSites = { BLOCKED_SITES_MAP, domainsForLabels, allDomains }
