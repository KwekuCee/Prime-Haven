// Off-platform communication detector & moderation helper for Prime Haven

export interface ModerationResult {
  isFlagged: boolean;
  reasons: string[];
  matchedKeywords: string[];
}

// Regex patterns to detect external communication channels
const PHONE_REGEX = /(\+?[0-9]{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?[\d\s-]{7,14}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const SOCIAL_HANDLE_REGEX = /(@[a-zA-Z0-9_]{3,30}|(?:instagram|ig|tiktok|telegram|snapchat|twitter|x\.com)[\s:]+[@a-zA-Z0-9_.-]+)/gi;

const OFF_PLATFORM_KEYWORDS = [
  'whatsapp',
  'telegram',
  'call me',
  'text me',
  'phone number',
  'my number',
  'reach me on',
  'contact me on',
  'dm me',
  'pay directly',
  'pay outside',
  'pay privately',
  'send to my momo',
  'momo number',
  'mobile money number',
  'different platform',
  'off platform',
  'outside prime haven',
  'outside the platform',
  'signal app',
  'zoom link',
  'google meet',
  'skype',
  'inbox me',
  'send email',
  'my email is',
];

export const checkOffPlatformContent = (text: string): ModerationResult => {
  const normalized = text.toLowerCase();
  const reasons: string[] = [];
  const matchedKeywords: string[] = [];

  // Check phone numbers (ignoring simple short numbers or project IDs)
  const phoneMatches = text.match(PHONE_REGEX);
  if (phoneMatches) {
    // Filter out short sequences like 2026, currency 500, etc.
    const validPhones = phoneMatches.filter(p => {
      const digits = p.replace(/\D/g, '');
      return digits.length >= 9 && digits.length <= 15;
    });
    if (validPhones.length > 0) {
      reasons.push('Phone number detected');
      matchedKeywords.push(...validPhones);
    }
  }

  // Check email addresses
  const emailMatches = text.match(EMAIL_REGEX);
  if (emailMatches && emailMatches.length > 0) {
    reasons.push('Email address detected');
    matchedKeywords.push(...emailMatches);
  }

  // Check social handles
  const socialMatches = text.match(SOCIAL_HANDLE_REGEX);
  if (socialMatches && socialMatches.length > 0) {
    reasons.push('External social handle detected');
    matchedKeywords.push(...socialMatches);
  }

  // Check off-platform keywords
  for (const keyword of OFF_PLATFORM_KEYWORDS) {
    if (normalized.includes(keyword)) {
      reasons.push(`Off-platform request phrase: "${keyword}"`);
      matchedKeywords.push(keyword);
    }
  }

  return {
    isFlagged: reasons.length > 0,
    reasons: Array.from(new Set(reasons)),
    matchedKeywords: Array.from(new Set(matchedKeywords)),
  };
};

export const OFF_PLATFORM_WARNING_MESSAGE = 
  "⚠️ All communication and payments must strictly remain on Prime Haven. Sharing phone numbers, WhatsApp, email, or discussing moving conversations to other platforms is a direct violation of our Terms of Service. Doing so will result in IMMEDIATE PROJECT CANCELLATION without any refund.";
