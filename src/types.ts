export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FlowRule {
  id: string;
  condition: string;
  action: string;
}

export interface SubAgent {
  id: string;
  name: string;
  role: string;
  icon: string;
  isEnabled: boolean;
  systemPrompt: string;
  responsibilities: string[];
  suggestedTriggers: string[];
  selectedModel: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview';
  delegatedCount: number;
}

export interface AgentConfig {
  name: string;
  avatarSeed: string;
  avatarImage?: string;
  bio: string;
  systemPrompt: string;
  toneStyle: 'formal' | 'casual' | 'warm' | 'assertive';
  faq: FAQItem[];
  flowRules: FlowRule[];
  selectedModel?: 'gemini-3.5-flash' | 'gemini-3.1-pro-preview';
  subAgents?: SubAgent[];
  ownerPhone?: string;
}

export interface Message {
  id: string;
  sender: 'customer' | 'admin';
  text: string;
  timestamp: string; // ISO String
  status?: 'sent' | 'read';
  isVoice?: boolean;
  voiceDuration?: string;
  voiceTranscriptStatus?: 'pending' | 'success' | 'failed';
}

export interface ChatSession {
  id: string;
  customerName: string;
  customerPhone: string;
  avatarSeed: string;
  messages: Message[];
  unreadCount: number;
}

export interface BusinessInput {
  businessName: string;
  businessDescription: string;
  targetMarket: string;
  toneStyle: 'formal' | 'casual' | 'warm' | 'assertive';
  agentGoal: string;
}
