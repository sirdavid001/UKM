import type { AppFlags, PromptTemplate } from "@/core/types";

export const APP_FLAGS: AppFlags = {
  launchMode: true,
  curiosityHintsEnabled: false,
  growthAutomationEnabled: false,
  globalOptimizationEnabled: false,
};

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "prompt-ama",
    slug: "ask-me-anything",
    title: "Ask me anything",
    baseRank: 100,
    suggestedReplies: ["What are you obsessed with lately?", "What should people ask you about?", "What always makes you laugh?"],
    copyVariants: {
      a: "Ask me anything on UKM. No names, just honesty.",
      b: "Anonymous Q&A time. Drop me something unexpected on UKM.",
    },
    isActive: true,
  },
  {
    id: "prompt-honest",
    slug: "be-honest-about-me",
    title: "Be honest about me",
    baseRank: 96,
    suggestedReplies: ["First impression?", "What vibe do I give off?", "What would you change about me?"],
    copyVariants: {
      a: "Be honest about me on UKM. Say what you actually think.",
      b: "No names. No filters. Tell me the truth on UKM.",
    },
    isActive: true,
  },
  {
    id: "prompt-opinion",
    slug: "what-do-you-think-of-me",
    title: "What do you think of me?",
    baseRank: 92,
    suggestedReplies: ["What stands out about me?", "What should I lean into more?", "What do you notice first?"],
    copyVariants: {
      a: "What do you really think of me? Answer on UKM.",
      b: "Give me your honest read. UKM link below.",
    },
    isActive: true,
  },
  {
    id: "prompt-know",
    slug: "tell-me-something-i-should-know",
    title: "Tell me something I should know",
    baseRank: 89,
    suggestedReplies: ["What do I miss about myself?", "What should I try next?", "What energy am I giving off?"],
    copyVariants: {
      a: "Tell me something I should know. Anonymous replies only.",
      b: "Say the thing you’d never text me directly. UKM below.",
    },
    isActive: true,
  },
];

export const STARTER_MESSAGES = [
  "What should people ask you about?",
  "What made you join UKM?",
];

export const SHARE_CHANNELS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "instagram_story", label: "Instagram Story" },
  { key: "generic", label: "More" },
] as const;

export const LAUNCH_COHORT_REQUIREMENTS = {
  activeOwners14d: 100,
  organicSubmissions14d: 500,
  promptViews: 50,
  promptSubmissions: 5,
};
