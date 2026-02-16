'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FiSearch, FiFileText, FiUpload, FiDownload, FiMessageCircle, FiChevronRight, FiCheck, FiX, FiMaximize2, FiSend, FiBookOpen, FiTarget, FiUsers, FiTrendingUp, FiAward, FiClipboard, FiMap, FiZap, FiArrowRight, FiGlobe, FiBriefcase, FiFile, FiClock, FiChevronDown, FiChevronUp, FiLayers, FiShield, FiStar } from 'react-icons/fi'

// --- Constants ---
const AGENT_IDS = {
  research: '69934214bb2371e330b63d93',
  documents: '699342147b9217c149bede1e',
  preparation: '6993421510e4384f4eb4a070',
  copilot: '6993421512539fd6994b5e83',
} as const

const AGENT_INFO = [
  { id: AGENT_IDS.research, name: 'Research & Intelligence Coordinator', purpose: 'Company research, competitive analysis, skill gap mapping' },
  { id: AGENT_IDS.documents, name: 'Strategic Documents Coordinator', purpose: 'Resume optimization, cover letters, outreach emails' },
  { id: AGENT_IDS.preparation, name: 'Preparation & Simulation Coordinator', purpose: 'Question banks, technical guides, case studies' },
  { id: AGENT_IDS.copilot, name: 'Interview Copilot Chat', purpose: 'Real-time coaching, critique, simulation, Q&A' },
]

// --- Types ---
type ScreenType = 'input' | 'processing' | 'commandCenter'
type PhaseStatus = 'pending' | 'active' | 'completed' | 'error'
type CopilotMode = 'Coaching' | 'Critique' | 'Simulation' | 'Q&A'

interface PhaseState {
  research: PhaseStatus
  documents: PhaseStatus
  preparation: PhaseStatus
}

interface ResearchData {
  executive_dossier?: string
  competitive_brief?: string
  skill_matrix?: string
  culture_map?: string
  summary?: string
}

interface DocumentsData {
  optimized_resume?: string
  cover_letter?: string
  hr_outreach_email?: string
  positioning_summary?: string
  behavioral_answer_bank?: string
  summary?: string
}

interface PrepData {
  question_bank?: string
  technical_guide?: string
  case_walkthroughs?: string
  tactical_plan?: string
  summary?: string
}

interface CopilotResponse {
  response?: string
  mode?: string
  references?: string
  follow_up_suggestions?: string
}

interface ArtifactFile {
  file_url: string
  name?: string
  format_type?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  mode?: string
  references?: string
  suggestions?: string
}

interface DeliverableCard {
  id: string
  title: string
  phase: 'research' | 'documents' | 'preparation'
  field: string
  icon: React.ReactNode
  content: string
}

// --- Safe parse helper ---
function safeParseResult(result: any): Record<string, any> {
  try {
    const r = result?.response?.result
    if (!r) return {}
    if (typeof r === 'string') {
      try { return JSON.parse(r) } catch { return { text: r } }
    }
    return r
  } catch { return {} }
}

function getArtifactFiles(result: any): ArtifactFile[] {
  const files = result?.module_outputs?.artifact_files
  if (Array.isArray(files)) return files
  return []
}

// --- Markdown Renderer ---
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1 font-serif tracking-wide" style={{ color: 'hsl(36 60% 31%)' }}>{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1 font-serif tracking-wide" style={{ color: 'hsl(36 60% 31%)' }}>{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2 font-serif tracking-wide">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm text-muted-foreground">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm text-muted-foreground">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

// --- Sample Data ---
const SAMPLE_RESEARCH: ResearchData = {
  executive_dossier: "# Stripe Inc. Executive Dossier\n\n## Company Overview\nStripe is a financial infrastructure platform that powers online commerce. Founded in 2010 by Patrick and John Collison, the company has grown to serve millions of businesses worldwide.\n\n## Key Leadership\n- **Patrick Collison** - CEO & Co-founder\n- **John Collison** - President & Co-founder\n- **David Singleton** - CTO\n\n## Recent Developments\n- Launched Stripe Financial Connections for bank account verification\n- Revenue exceeded $14B in 2023\n- Major push into embedded finance and banking-as-a-service\n\n## Culture & Values\n- Strong engineering-first culture\n- Emphasis on writing and clear thinking\n- Move fast with high quality standards",
  competitive_brief: "# Competitive Positioning Brief\n\n## Primary Competitors\n1. **Adyen** - Enterprise-focused, strong in Europe\n2. **Square (Block)** - SMB-focused, hardware integration\n3. **PayPal/Braintree** - Consumer brand, legacy integrations\n\n## Stripe's Moat\n- Developer experience and API design\n- Global infrastructure (46+ countries)\n- Full-stack financial platform\n\n## Market Position\n- Estimated 20%+ of US online payments\n- Premium pricing justified by developer productivity\n- Strong network effects from ecosystem",
  skill_matrix: "# Skill Matrix & Gap Analysis\n\n## Required Skills (Senior PM)\n- **Product Strategy** - Required: Expert | Your Level: Advanced\n- **Technical Depth** - Required: Advanced | Your Level: Advanced\n- **Data Analysis** - Required: Advanced | Your Level: Intermediate\n- **Cross-functional Leadership** - Required: Expert | Your Level: Advanced\n\n## Gap Areas\n1. Payments domain knowledge - Recommend deep-dive into PSP architectures\n2. Financial regulation awareness - Study PCI-DSS, PSD2\n3. API product management - Review Stripe's API changelog approach",
  culture_map: "# Culture Fit Risk Map\n\n## High Alignment\n- Writing-first culture matches your documentation skills\n- Builder mindset aligns with hands-on approach\n- Fast iteration preference matches Stripe velocity\n\n## Watch Areas\n- High autonomy environment - prepare examples of self-directed work\n- Emphasis on intellectual rigor - be ready for deep technical probing\n- Global-first thinking required\n\n## Interview Culture\n- Expect product case studies with real Stripe scenarios\n- Technical depth questions on system design\n- Strong emphasis on communication clarity",
  summary: "Comprehensive research completed for Senior Product Manager role at Stripe. Key findings: strong engineering culture, payments domain expertise critical, emphasis on writing and clear thinking. 4 deliverables generated with actionable insights."
}

const SAMPLE_DOCUMENTS: DocumentsData = {
  optimized_resume: "# Optimized Resume\n\n## Professional Summary\nSenior Product Manager with 8+ years of experience building developer platforms and API products at scale. Proven track record of launching products used by 100K+ developers, with expertise in payments infrastructure and platform strategy.\n\n## Key Achievements\n- Led launch of payment orchestration platform serving $2B+ in annual volume\n- Grew developer adoption 3x through API redesign and documentation overhaul\n- Defined product strategy for real-time financial data platform\n\n## Skills Highlighted\n- API Product Management\n- Developer Experience Design\n- Financial Infrastructure\n- Cross-functional Leadership",
  cover_letter: "# Cover Letter\n\nDear Stripe Hiring Team,\n\nI am writing to express my strong interest in the Senior Product Manager role at Stripe. Your mission to increase the GDP of the internet resonates deeply with my career focus on building developer-first financial infrastructure.\n\n## Why Stripe\nYour approach to treating APIs as products, not just interfaces, aligns perfectly with my product philosophy. I have spent the past 5 years building payment platforms where developer experience was the primary differentiator.\n\n## What I Bring\n- Deep payments domain expertise from building PSP integrations\n- Track record of launching products that developers love\n- Experience scaling products across 20+ international markets\n\nI would welcome the opportunity to discuss how my experience can contribute to Stripe's next chapter of growth.",
  hr_outreach_email: "# HR Outreach Email\n\nSubject: Senior PM Application - Passionate About Developer-First Payments\n\nHi [Recruiter Name],\n\nI recently applied for the Senior Product Manager position and wanted to share why I'm particularly excited about this opportunity.\n\nI've been following Stripe's product evolution since your v2 API launch, and your recent moves into financial connections and embedded finance are exactly the kind of platform challenges I thrive on.\n\nWould love to connect for a brief chat about how my background in payments infrastructure and API product management aligns with your team's priorities.\n\nBest regards",
  positioning_summary: "# Executive Positioning Summary\n\n## Core Narrative\nYou are a payments-native product leader who builds developer infrastructure at scale. Your differentiator is combining deep technical fluency with strategic product vision.\n\n## Key Talking Points\n1. **Scale Experience** - Managed products processing $2B+ annually\n2. **Developer Empathy** - Built and shipped APIs used by 100K+ developers\n3. **Global Perspective** - Launched in 20+ markets with localization\n4. **Data-Driven** - Established product analytics frameworks from scratch",
  behavioral_answer_bank: "# Behavioral Answer Bank\n\n## Tell me about a time you made a difficult product decision\n**Situation:** Had to choose between backward compatibility and a clean API redesign\n**Task:** Balance existing customer needs with long-term platform health\n**Action:** Conducted impact analysis, created migration plan, ran beta with top customers\n**Result:** Successfully migrated 95% of customers in 3 months with zero revenue impact\n\n## Describe a product you're most proud of\n**Situation:** Payments platform lacked real-time visibility\n**Task:** Build a developer dashboard for payment monitoring\n**Action:** Led cross-functional team of 12, shipped MVP in 6 weeks\n**Result:** Reduced support tickets by 40%, became highest-rated feature",
  summary: "Strategic documents package complete. 5 deliverables optimized for Stripe's culture: resume highlighting API/payments expertise, tailored cover letter, outreach email, positioning framework, and STAR-method behavioral answers."
}

const SAMPLE_PREP: PrepData = {
  question_bank: "# Interview Question Bank\n\n## Product Strategy Questions\n1. How would you prioritize features for Stripe's payment links product?\n2. A merchant is churning because of settlement times. What do you do?\n3. Design a product strategy for Stripe entering the B2B payments space\n\n## Technical Questions\n4. Explain how payment authorization, capture, and settlement work\n5. How would you design an idempotency system for payment APIs?\n6. Walk through the architecture of a real-time fraud detection system\n\n## Behavioral Questions\n7. Tell me about a time you had to say no to a powerful stakeholder\n8. Describe a product launch that didn't go as planned\n9. How do you handle disagreements with engineering leads?",
  technical_guide: "# Technical Mastery Guide\n\n## Payment Processing Fundamentals\n- **Authorization** - Real-time check with issuing bank\n- **Capture** - Actual fund transfer initiation\n- **Settlement** - Fund movement between banks (T+1 to T+3)\n\n## API Design Patterns (Stripe-specific)\n- RESTful with predictable resource URLs\n- Versioning via date-based headers\n- Webhook-first for async operations\n- Idempotency keys for safe retries\n\n## System Design Topics\n- Distributed payment routing\n- Multi-currency conversion engines\n- PCI compliance in microservices\n- Real-time fraud scoring pipelines",
  case_walkthroughs: "# Case Study Walkthroughs\n\n## Case 1: Stripe Launches in India\n**Framework:** Market entry analysis\n- Regulatory landscape (RBI guidelines, UPI dominance)\n- Go-to-market: partner with top Indian SaaS companies\n- Product adaptations: support UPI, net banking, local cards\n- Success metrics: GMV, merchant count, payment success rate\n\n## Case 2: Building Stripe Identity\n**Framework:** New product development\n- Problem: merchants need KYC but it's painful\n- Solution: API-first identity verification\n- Build vs. buy analysis for OCR/ML components\n- Pricing strategy: per-verification vs. subscription",
  tactical_plan: "# Tactical Preparation Plan\n\n## Week 1: Foundation\n- Day 1-2: Deep-dive into Stripe's public documentation and blog\n- Day 3-4: Study payments industry (PSP, acquirer, issuer ecosystem)\n- Day 5: Practice product case frameworks\n\n## Week 2: Depth\n- Day 1-2: Technical deep-dive on API design and system architecture\n- Day 3-4: Mock interviews with behavioral questions\n- Day 5: Review competitive landscape\n\n## Day Before\n- Review key talking points from positioning summary\n- Re-read job description and map to your stories\n- Prepare 5 thoughtful questions for each interviewer\n\n## Interview Day\n- Arrive 10 minutes early\n- Have water and notes ready\n- Lead with frameworks, then get specific",
  summary: "Full preparation package ready. 4 deliverables covering question prediction (9 questions across 3 categories), technical deep-dive on payments infrastructure, 2 detailed case walkthroughs, and a 2-week tactical study plan."
}

// --- Deliverable Card Definitions ---
function getDeliverables(research: ResearchData, documents: DocumentsData, prep: PrepData): DeliverableCard[] {
  return [
    { id: 'executive_dossier', title: 'Executive Company Dossier', phase: 'research', field: 'executive_dossier', icon: <FiGlobe className="w-4 h-4" />, content: research?.executive_dossier ?? '' },
    { id: 'competitive_brief', title: 'Competitive Positioning Brief', phase: 'research', field: 'competitive_brief', icon: <FiTrendingUp className="w-4 h-4" />, content: research?.competitive_brief ?? '' },
    { id: 'skill_matrix', title: 'Skill Matrix & Gap Analysis', phase: 'research', field: 'skill_matrix', icon: <FiTarget className="w-4 h-4" />, content: research?.skill_matrix ?? '' },
    { id: 'culture_map', title: 'Culture Fit Risk Map', phase: 'research', field: 'culture_map', icon: <FiMap className="w-4 h-4" />, content: research?.culture_map ?? '' },
    { id: 'optimized_resume', title: 'Optimized Resume', phase: 'documents', field: 'optimized_resume', icon: <FiFileText className="w-4 h-4" />, content: documents?.optimized_resume ?? '' },
    { id: 'cover_letter', title: 'Cover Letter', phase: 'documents', field: 'cover_letter', icon: <FiClipboard className="w-4 h-4" />, content: documents?.cover_letter ?? '' },
    { id: 'hr_outreach_email', title: 'HR Outreach Email', phase: 'documents', field: 'hr_outreach_email', icon: <FiSend className="w-4 h-4" />, content: documents?.hr_outreach_email ?? '' },
    { id: 'positioning_summary', title: 'Executive Positioning Summary', phase: 'documents', field: 'positioning_summary', icon: <FiAward className="w-4 h-4" />, content: documents?.positioning_summary ?? '' },
    { id: 'behavioral_answer_bank', title: 'Behavioral Answer Bank', phase: 'documents', field: 'behavioral_answer_bank', icon: <FiUsers className="w-4 h-4" />, content: documents?.behavioral_answer_bank ?? '' },
    { id: 'question_bank', title: 'Question Bank', phase: 'preparation', field: 'question_bank', icon: <FiBookOpen className="w-4 h-4" />, content: prep?.question_bank ?? '' },
    { id: 'technical_guide', title: 'Technical Mastery Guide', phase: 'preparation', field: 'technical_guide', icon: <FiZap className="w-4 h-4" />, content: prep?.technical_guide ?? '' },
    { id: 'case_walkthroughs', title: 'Case Study Walkthroughs', phase: 'preparation', field: 'case_walkthroughs', icon: <FiLayers className="w-4 h-4" />, content: prep?.case_walkthroughs ?? '' },
    { id: 'tactical_plan', title: 'Tactical Preparation Plan', phase: 'preparation', field: 'tactical_plan', icon: <FiClock className="w-4 h-4" />, content: prep?.tactical_plan ?? '' },
  ]
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  research: { label: 'Research', color: 'hsl(27 61% 35%)' },
  documents: { label: 'Documents', color: 'hsl(36 60% 31%)' },
  preparation: { label: 'Preparation', color: 'hsl(30 50% 40%)' },
}

// --- Subcomponents ---

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 ml-2">
      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  )
}

function FileDropZone({
  label,
  file,
  onFileSelect,
  onClear,
}: {
  label: string
  file: File | null
  onFileSelect: (f: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) onFileSelect(droppedFile)
  }, [onFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="space-y-2">
      <label className="text-sm font-sans text-muted-foreground">{label}</label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer transition-all duration-200 hover:border-foreground/30 hover:bg-secondary/50"
      >
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <FiFile className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(36 60% 31%)' }} />
              <span className="truncate max-w-[200px]">{file.name}</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClear() }}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <FiX className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-2">
            <FiUpload className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-sans">Drop file or click to browse</span>
            <span className="text-xs text-muted-foreground/60 font-sans">PDF, DOCX</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFileSelect(f)
        }}
      />
    </div>
  )
}

function PhaseTimeline({ phases, currentPhase }: { phases: PhaseState; currentPhase: string }) {
  const items = [
    { key: 'research', label: 'Research & Intelligence', desc: 'Analyzing company, competitors, culture, and skills', icon: <FiSearch className="w-5 h-5" /> },
    { key: 'documents', label: 'Strategic Documents', desc: 'Creating resume, cover letter, emails, and answer bank', icon: <FiFileText className="w-5 h-5" /> },
    { key: 'preparation', label: 'Preparation & Simulation', desc: 'Building question bank, guides, cases, and tactical plan', icon: <FiTarget className="w-5 h-5" /> },
  ]

  return (
    <div className="space-y-0">
      {items.map((item, idx) => {
        const status = phases[item.key as keyof PhaseState]
        const isLast = idx === items.length - 1
        return (
          <div key={item.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                status === 'completed' ? 'border-green-600 bg-green-600/20' :
                status === 'active' ? 'border-foreground/60 bg-secondary' :
                status === 'error' ? 'border-red-500 bg-red-500/20' :
                'border-border bg-card'
              )}>
                {status === 'completed' ? (
                  <FiCheck className="w-5 h-5 text-green-400" />
                ) : status === 'active' ? (
                  <div className="w-5 h-5 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: 'hsl(36 60% 31%)' }} />
                  </div>
                ) : status === 'error' ? (
                  <FiX className="w-5 h-5 text-red-400" />
                ) : (
                  <span className="text-muted-foreground">{item.icon}</span>
                )}
              </div>
              {!isLast && (
                <div className={cn(
                  "w-0.5 h-16 transition-all duration-500",
                  status === 'completed' ? 'bg-green-600/40' : 'bg-border'
                )} />
              )}
            </div>
            <div className="pt-1.5 pb-8">
              <h3 className={cn(
                "font-serif text-lg tracking-wide transition-colors",
                status === 'active' ? 'text-foreground' :
                status === 'completed' ? 'text-foreground/80' :
                'text-muted-foreground'
              )}>
                {item.label}
              </h3>
              <p className="text-sm text-muted-foreground font-sans mt-0.5">{item.desc}</p>
              {status === 'active' && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-sans" style={{ color: 'hsl(36 60% 31%)' }}>Processing</span>
                  <LoadingDots />
                </div>
              )}
              {status === 'completed' && (
                <span className="text-xs text-green-400 font-sans mt-1 block">Complete</span>
              )}
              {status === 'error' && (
                <span className="text-xs text-red-400 font-sans mt-1 block">Error occurred</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DeliverableCardComponent({
  deliverable,
  onExpand,
  hasFiles,
  onDownload,
}: {
  deliverable: DeliverableCard
  onExpand: () => void
  hasFiles: boolean
  onDownload?: () => void
}) {
  const preview = (deliverable.content ?? '').replace(/[#*\-]/g, '').trim().slice(0, 120)
  const phaseInfo = PHASE_LABELS[deliverable.phase]

  return (
    <Card
      className="cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:border-foreground/20 group"
      onClick={onExpand}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-secondary" style={{ color: phaseInfo?.color }}>
              {deliverable.icon}
            </div>
            <div>
              <CardTitle className="text-sm font-serif tracking-wide">{deliverable.title}</CardTitle>
              <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 font-sans" style={{ borderColor: phaseInfo?.color, color: phaseInfo?.color }}>
                {phaseInfo?.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasFiles && onDownload && (
              <button
                onClick={(e) => { e.stopPropagation(); onDownload() }}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                title="Download files"
              >
                <FiDownload className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            <div className="p-1.5">
              <FiMaximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground font-sans line-clamp-2 leading-relaxed">
          {preview || 'Content will appear after generation...'}
        </p>
      </CardContent>
    </Card>
  )
}

function SidebarNav({
  activePhase,
  onPhaseSelect,
  deliverables,
}: {
  activePhase: string
  onPhaseSelect: (phase: string) => void
  deliverables: DeliverableCard[]
}) {
  const phases = [
    { key: 'all', label: 'All Deliverables', icon: <FiLayers className="w-4 h-4" />, count: deliverables.length },
    { key: 'research', label: 'Research', icon: <FiSearch className="w-4 h-4" />, count: deliverables.filter(d => d.phase === 'research').length },
    { key: 'documents', label: 'Documents', icon: <FiFileText className="w-4 h-4" />, count: deliverables.filter(d => d.phase === 'documents').length },
    { key: 'preparation', label: 'Preparation', icon: <FiTarget className="w-4 h-4" />, count: deliverables.filter(d => d.phase === 'preparation').length },
  ]

  return (
    <nav className="space-y-1">
      {phases.map((phase) => (
        <button
          key={phase.key}
          onClick={() => onPhaseSelect(phase.key)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans transition-all duration-200 text-left",
            activePhase === phase.key
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          )}
        >
          {phase.icon}
          <span className="flex-1">{phase.label}</span>
          <span className="text-xs text-muted-foreground">{phase.count}</span>
        </button>
      ))}
    </nav>
  )
}

function CopilotPanel({
  isOpen,
  onClose,
  messages,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  mode,
  onModeChange,
  suggestions,
}: {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
  inputValue: string
  onInputChange: (v: string) => void
  onSend: () => void
  isLoading: boolean
  mode: CopilotMode
  onModeChange: (m: CopilotMode) => void
  suggestions: string[]
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const modes: CopilotMode[] = ['Coaching', 'Critique', 'Simulation', 'Q&A']

  const quickPrompts = [
    'How should I answer "Why Stripe?"',
    'Review my resume positioning',
    'Run a mock behavioral round',
    'What questions should I ask?',
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[440px] lg:w-[480px] bg-card border-l border-border shadow-2xl shadow-black/40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'hsl(36 60% 31% / 0.2)' }}>
              <FiMessageCircle className="w-4 h-4" style={{ color: 'hsl(36 60% 31%)' }} />
            </div>
            <h3 className="font-serif text-base tracking-wide">Interview Copilot</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <FiX className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-sans transition-all duration-200",
                mode === m
                  ? 'text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
              style={mode === m ? { backgroundColor: 'hsl(36 60% 31%)' } : undefined}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: 'hsl(36 60% 31% / 0.15)' }}>
                <FiMessageCircle className="w-6 h-6" style={{ color: 'hsl(36 60% 31%)' }} />
              </div>
              <div>
                <p className="text-sm font-serif text-foreground">Your Interview Strategy Partner</p>
                <p className="text-xs text-muted-foreground font-sans mt-1">Ask anything about your preparation materials</p>
              </div>
              <div className="space-y-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { onInputChange(prompt); }}
                    className="w-full text-left text-xs font-sans px-3 py-2 rounded-lg bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                "max-w-[85%] rounded-xl px-3.5 py-2.5",
                msg.role === 'user'
                  ? 'bg-secondary text-foreground'
                  : 'bg-muted/50 text-foreground'
              )}>
                {msg.role === 'assistant' ? (
                  <div>
                    {msg.mode && (
                      <Badge variant="outline" className="mb-2 text-[10px] font-sans" style={{ borderColor: 'hsl(36 60% 31%)', color: 'hsl(36 60% 31%)' }}>
                        {msg.mode}
                      </Badge>
                    )}
                    <div className="text-sm font-sans">{renderMarkdown(msg.content)}</div>
                    {msg.references && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider mb-1">References</p>
                        <p className="text-xs text-muted-foreground font-sans">{msg.references}</p>
                      </div>
                    )}
                    {msg.suggestions && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider mb-1">Follow-up</p>
                        <p className="text-xs text-muted-foreground font-sans">{msg.suggestions}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-sans">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-xl px-4 py-3">
                <LoadingDots />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Suggestions from last response */}
      {suggestions.length > 0 && (
        <div className="px-4 py-2 border-t border-border flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onInputChange(s)}
                className="flex-shrink-0 text-[10px] font-sans px-2 py-1 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Ask about your interview prep..."
            className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            onClick={onSend}
            disabled={isLoading || !inputValue.trim()}
            className="p-2.5 rounded-lg transition-all duration-200 disabled:opacity-40"
            style={{ backgroundColor: 'hsl(36 60% 31%)' }}
          >
            <FiSend className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Main Page ---

export default function Page() {
  // Screen state
  const [screen, setScreen] = useState<ScreenType>('input')
  const [sampleMode, setSampleMode] = useState(false)

  // Input state
  const [companyUrl, setCompanyUrl] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  // Processing state
  const [phases, setPhases] = useState<PhaseState>({ research: 'pending', documents: 'pending', preparation: 'pending' })
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Results state
  const [researchData, setResearchData] = useState<ResearchData>({})
  const [documentsData, setDocumentsData] = useState<DocumentsData>({})
  const [prepData, setPrepData] = useState<PrepData>({})
  const [researchFiles, setResearchFiles] = useState<ArtifactFile[]>([])
  const [documentsFiles, setDocumentsFiles] = useState<ArtifactFile[]>([])
  const [prepFiles, setPrepFiles] = useState<ArtifactFile[]>([])

  // Command Center state
  const [activePhaseFilter, setActivePhaseFilter] = useState('all')
  const [expandedDeliverable, setExpandedDeliverable] = useState<DeliverableCard | null>(null)

  // Copilot state
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [copilotMode, setCopilotMode] = useState<CopilotMode>('Coaching')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSuggestions, setChatSuggestions] = useState<string[]>([])

  // Agent info
  const [showAgentInfo, setShowAgentInfo] = useState(false)

  // Derived state
  const effectiveResearch = sampleMode ? SAMPLE_RESEARCH : researchData
  const effectiveDocuments = sampleMode ? SAMPLE_DOCUMENTS : documentsData
  const effectivePrep = sampleMode ? SAMPLE_PREP : prepData
  const deliverables = getDeliverables(effectiveResearch, effectiveDocuments, effectivePrep)
  const filteredDeliverables = activePhaseFilter === 'all' ? deliverables : deliverables.filter(d => d.phase === activePhaseFilter)

  const companyName = companyUrl ? companyUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.')[0] : 'Company'

  // Get files for a phase
  function getFilesForPhase(phase: string): ArtifactFile[] {
    switch (phase) {
      case 'research': return researchFiles
      case 'documents': return documentsFiles
      case 'preparation': return prepFiles
      default: return []
    }
  }

  // Launch preparation
  async function handleLaunch() {
    if (!companyUrl.trim() || !targetRole.trim()) return

    setScreen('processing')
    setProcessingError(null)
    setPhases({ research: 'pending', documents: 'pending', preparation: 'pending' })

    let uploadedAssets: string[] = []

    // Upload files if any
    const filesToUpload: File[] = []
    if (jdFile) filesToUpload.push(jdFile)
    if (resumeFile) filesToUpload.push(resumeFile)

    if (filesToUpload.length > 0) {
      try {
        const uploadResult = await uploadFiles(filesToUpload)
        if (uploadResult.success && Array.isArray(uploadResult.asset_ids)) {
          uploadedAssets = uploadResult.asset_ids
        }
      } catch {
        // Continue without uploads
      }
    }

    // Phase 1: Research
    setPhases(prev => ({ ...prev, research: 'active' }))
    setActiveAgentId(AGENT_IDS.research)
    let researchResult: any = null
    let parsedResearch: ResearchData = {}

    try {
      const researchPrompt = `Research the company at ${companyUrl} for the role of ${targetRole}. Provide comprehensive analysis including executive dossier, competitive brief, skill matrix, and culture map.`
      researchResult = await callAIAgent(
        researchPrompt,
        AGENT_IDS.research,
        uploadedAssets.length > 0 ? { assets: uploadedAssets } : undefined
      )

      if (researchResult?.success) {
        parsedResearch = safeParseResult(researchResult) as ResearchData
        setResearchData(parsedResearch)
        setResearchFiles(getArtifactFiles(researchResult))
        setPhases(prev => ({ ...prev, research: 'completed' }))
      } else {
        setPhases(prev => ({ ...prev, research: 'error' }))
        setProcessingError(researchResult?.error ?? 'Research phase failed')
      }
    } catch (err) {
      setPhases(prev => ({ ...prev, research: 'error' }))
      setProcessingError('Research phase encountered an error')
    }

    // Phase 2: Documents
    setPhases(prev => ({ ...prev, documents: 'active' }))
    setActiveAgentId(AGENT_IDS.documents)
    let parsedDocs: DocumentsData = {}

    try {
      const researchContext = Object.keys(parsedResearch).length > 0 ? JSON.stringify(parsedResearch).slice(0, 3000) : ''
      const docsPrompt = `Using the following research context: ${researchContext}\n\nCreate strategic documents for the role of ${targetRole} at ${companyName}. Include optimized resume, cover letter, HR outreach email, positioning summary, and behavioral answer bank.`
      const docsResult = await callAIAgent(
        docsPrompt,
        AGENT_IDS.documents,
        uploadedAssets.length > 0 ? { assets: uploadedAssets } : undefined
      )

      if (docsResult?.success) {
        parsedDocs = safeParseResult(docsResult) as DocumentsData
        setDocumentsData(parsedDocs)
        setDocumentsFiles(getArtifactFiles(docsResult))
        setPhases(prev => ({ ...prev, documents: 'completed' }))
      } else {
        setPhases(prev => ({ ...prev, documents: 'error' }))
      }
    } catch {
      setPhases(prev => ({ ...prev, documents: 'error' }))
    }

    // Phase 3: Preparation
    setPhases(prev => ({ ...prev, preparation: 'active' }))
    setActiveAgentId(AGENT_IDS.preparation)

    try {
      const researchContext = Object.keys(parsedResearch).length > 0 ? JSON.stringify(parsedResearch).slice(0, 2000) : ''
      const docsContext = Object.keys(parsedDocs).length > 0 ? JSON.stringify(parsedDocs).slice(0, 2000) : ''
      const prepPrompt = `Using research: ${researchContext}\nDocuments: ${docsContext}\n\nCreate comprehensive preparation materials for ${targetRole} at ${companyName}. Include question bank, technical guide, case walkthroughs, and tactical plan.`
      const prepResult = await callAIAgent(
        prepPrompt,
        AGENT_IDS.preparation,
        uploadedAssets.length > 0 ? { assets: uploadedAssets } : undefined
      )

      if (prepResult?.success) {
        const parsedPrep = safeParseResult(prepResult) as PrepData
        setPrepData(parsedPrep)
        setPrepFiles(getArtifactFiles(prepResult))
        setPhases(prev => ({ ...prev, preparation: 'completed' }))
      } else {
        setPhases(prev => ({ ...prev, preparation: 'error' }))
      }
    } catch {
      setPhases(prev => ({ ...prev, preparation: 'error' }))
    }

    setActiveAgentId(null)
    setScreen('commandCenter')
  }

  // Send copilot message
  async function handleCopilotSend() {
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)
    setActiveAgentId(AGENT_IDS.copilot)

    try {
      const researchCtx = JSON.stringify(effectiveResearch).slice(0, 1500)
      const docsCtx = JSON.stringify(effectiveDocuments).slice(0, 1500)
      const prepCtx = JSON.stringify(effectivePrep).slice(0, 1500)

      const copilotPrompt = `Mode: ${copilotMode}\nContext: Company=${companyName}, Role=${targetRole}.\nResearch Summary: ${researchCtx}\nDocuments Summary: ${docsCtx}\nPrep Summary: ${prepCtx}\n\nUser: ${userMessage}`
      const chatResult = await callAIAgent(copilotPrompt, AGENT_IDS.copilot)

      if (chatResult?.success) {
        const parsed = safeParseResult(chatResult) as CopilotResponse
        const responseText = parsed?.response ?? (parsed as any)?.text ?? chatResult?.response?.message ?? 'I received your message but could not generate a proper response.'

        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: typeof responseText === 'string' ? responseText : String(responseText),
          mode: parsed?.mode ?? copilotMode,
          references: parsed?.references ?? undefined,
          suggestions: parsed?.follow_up_suggestions ?? undefined,
        }])

        // Parse follow-up suggestions
        if (parsed?.follow_up_suggestions) {
          const sugList = parsed.follow_up_suggestions.split(/[,;\n]/).map(s => s.trim()).filter(s => s.length > 5).slice(0, 3)
          setChatSuggestions(sugList)
        } else {
          setChatSuggestions([])
        }
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
        }])
      }
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'A network error occurred. Please check your connection and try again.',
      }])
    }

    setChatLoading(false)
    setActiveAgentId(null)
  }

  function handleFileDownload(fileUrl: string) {
    window.open(fileUrl, '_blank')
  }

  // Progress percentage
  const completedCount = [phases.research, phases.documents, phases.preparation].filter(p => p === 'completed').length
  const progressPercent = Math.round((completedCount / 3) * 100)

  // --- RENDER: Input Screen ---
  if (screen === 'input') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(36 60% 31%)' }}>
              <FiShield className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-serif text-xl tracking-wide">InterviewEdge AI</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
              Sample Data
              <Switch checked={sampleMode} onCheckedChange={(checked) => {
                setSampleMode(checked)
                if (checked) {
                  setCompanyUrl('stripe.com')
                  setTargetRole('Senior Product Manager')
                } else {
                  setCompanyUrl('')
                  setTargetRole('')
                }
              }} />
            </label>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-lg">
            {/* Hero */}
            <div className="text-center mb-8">
              <h2 className="font-serif text-3xl md:text-4xl tracking-wide mb-3">
                Prepare to <span style={{ color: 'hsl(36 60% 31%)' }}>Win</span>
              </h2>
              <p className="text-muted-foreground font-sans text-sm max-w-md mx-auto">
                AI-powered interview preparation that researches the company, crafts your documents, and builds a complete preparation strategy.
              </p>
            </div>

            {/* Form */}
            <Card className="shadow-xl shadow-black/20">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-sans text-muted-foreground flex items-center gap-1.5">
                    <FiGlobe className="w-3.5 h-3.5" /> Company Website
                  </label>
                  <input
                    type="text"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    placeholder="e.g., stripe.com"
                    className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-sans text-muted-foreground flex items-center gap-1.5">
                    <FiBriefcase className="w-3.5 h-3.5" /> Target Role
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g., Senior Product Manager"
                    className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FileDropZone
                    label="Job Description (Optional)"
                    file={jdFile}
                    onFileSelect={setJdFile}
                    onClear={() => setJdFile(null)}
                  />
                  <FileDropZone
                    label="Your Resume (Optional)"
                    file={resumeFile}
                    onFileSelect={setResumeFile}
                    onClear={() => setResumeFile(null)}
                  />
                </div>

                <button
                  onClick={sampleMode ? () => setScreen('commandCenter') : handleLaunch}
                  disabled={!companyUrl.trim() || !targetRole.trim()}
                  className="w-full py-3 rounded-lg font-sans text-sm font-medium text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-black/20 flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'hsl(36 60% 31%)' }}
                >
                  Launch Preparation
                  <FiArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-xs text-muted-foreground font-sans">
                  Preparation takes 2-4 minutes for comprehensive analysis
                </p>
              </CardContent>
            </Card>

            {/* Agent info toggle */}
            <div className="mt-6">
              <button
                onClick={() => setShowAgentInfo(!showAgentInfo)}
                className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground font-sans hover:text-foreground transition-colors"
              >
                <FiStar className="w-3 h-3" />
                Powered by 4 AI Agents
                {showAgentInfo ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
              </button>
              {showAgentInfo && (
                <Card className="mt-3 shadow-lg shadow-black/10">
                  <CardContent className="p-4 space-y-2.5">
                    {AGENT_INFO.map((agent) => (
                      <div key={agent.id} className="flex items-start gap-2.5">
                        <div className={cn(
                          "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                          activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'
                        )} />
                        <div>
                          <p className="text-xs font-sans text-foreground">{agent.name}</p>
                          <p className="text-[10px] text-muted-foreground font-sans">{agent.purpose}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --- RENDER: Processing Screen ---
  if (screen === 'processing') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-6 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(36 60% 31%)' }}>
              <FiShield className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-serif text-xl tracking-wide">InterviewEdge AI</h1>
          </div>
          <Badge variant="outline" className="font-sans text-xs">
            {companyName} / {targetRole}
          </Badge>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl tracking-wide mb-2">Building Your Arsenal</h2>
              <p className="text-muted-foreground font-sans text-sm">
                Generating comprehensive interview preparation materials
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-sans text-muted-foreground">Overall Progress</span>
                <span className="text-xs font-sans text-muted-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>

            <Card className="shadow-xl shadow-black/20">
              <CardContent className="p-6">
                <PhaseTimeline phases={phases} currentPhase={activeAgentId ?? ''} />
              </CardContent>
            </Card>

            {processingError && (
              <Card className="mt-4 border-red-500/30">
                <CardContent className="p-4">
                  <p className="text-xs text-red-400 font-sans">{processingError}</p>
                  <p className="text-xs text-muted-foreground font-sans mt-1">Some phases may have completed successfully. Proceeding to results.</p>
                </CardContent>
              </Card>
            )}

            {/* Agent info */}
            <div className="mt-6">
              <Card>
                <CardContent className="p-4 space-y-2">
                  {AGENT_INFO.slice(0, 3).map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0 transition-all",
                        activeAgentId === agent.id ? 'bg-green-500 animate-pulse' :
                        phases[agent.id === AGENT_IDS.research ? 'research' : agent.id === AGENT_IDS.documents ? 'documents' : 'preparation'] === 'completed' ? 'bg-green-500' :
                        'bg-muted-foreground/30'
                      )} />
                      <p className="text-xs font-sans text-muted-foreground">{agent.name}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --- RENDER: Command Center ---
  const summaries = [
    { label: 'Research', content: effectiveResearch?.summary },
    { label: 'Documents', content: effectiveDocuments?.summary },
    { label: 'Preparation', content: effectivePrep?.summary },
  ]

  const totalDeliverables = deliverables.filter(d => (d.content ?? '').length > 0).length
  const totalFiles = [...researchFiles, ...documentsFiles, ...prepFiles].length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 md:px-6 py-3 flex items-center justify-between border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(36 60% 31%)' }}>
            <FiShield className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-serif text-lg md:text-xl tracking-wide">InterviewEdge AI</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-sans text-muted-foreground">
            Sample Data
            <Switch checked={sampleMode} onCheckedChange={setSampleMode} />
          </label>
          <button
            onClick={() => {
              setScreen('input')
              setResearchData({})
              setDocumentsData({})
              setPrepData({})
              setResearchFiles([])
              setDocumentsFiles([])
              setPrepFiles([])
              setChatMessages([])
              setPhases({ research: 'pending', documents: 'pending', preparation: 'pending' })
            }}
            className="text-xs font-sans text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
          >
            New Session
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-4 md:px-6 py-3 border-b border-border flex items-center gap-6 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <FiGlobe className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-sans text-muted-foreground">Company:</span>
          <span className="text-xs font-sans text-foreground font-medium capitalize">{companyName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <FiBriefcase className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-sans text-muted-foreground">Role:</span>
          <span className="text-xs font-sans text-foreground font-medium">{targetRole || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <FiFileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-sans text-muted-foreground">Deliverables:</span>
          <span className="text-xs font-sans text-foreground font-medium">{totalDeliverables}</span>
        </div>
        {totalFiles > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <FiDownload className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-sans text-muted-foreground">Files:</span>
            <span className="text-xs font-sans text-foreground font-medium">{totalFiles}</span>
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 lg:w-64 flex-col border-r border-border p-4 flex-shrink-0">
          <SidebarNav
            activePhase={activePhaseFilter}
            onPhaseSelect={setActivePhaseFilter}
            deliverables={deliverables}
          />

          {/* Summaries */}
          <div className="mt-6 space-y-3">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Phase Summaries</h4>
            {summaries.map((s, i) => (
              <div key={i} className="space-y-1">
                <p className="text-[10px] font-sans text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-xs text-foreground/70 font-sans line-clamp-3 leading-relaxed">
                  {s.content || 'Pending...'}
                </p>
              </div>
            ))}
          </div>

          {/* File Downloads */}
          {totalFiles > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Generated Files</h4>
              {[...researchFiles, ...documentsFiles, ...prepFiles].map((file, i) => (
                <button
                  key={i}
                  onClick={() => handleFileDownload(file.file_url)}
                  className="w-full flex items-center gap-2 text-xs font-sans text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-md hover:bg-secondary text-left"
                >
                  <FiDownload className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{file.name ?? `File ${i + 1}`}</span>
                </button>
              ))}
            </div>
          )}

          {/* Agent Status */}
          <div className="mt-auto pt-4 border-t border-border">
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans mb-2">AI Agents</h4>
            {AGENT_INFO.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2 py-1">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/20'
                )} />
                <span className="text-[10px] text-muted-foreground font-sans truncate">{agent.name}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          {/* Mobile filter */}
          <div className="md:hidden flex gap-1.5 mb-4 overflow-x-auto pb-2">
            {['all', 'research', 'documents', 'preparation'].map((phase) => (
              <button
                key={phase}
                onClick={() => setActivePhaseFilter(phase)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-sans whitespace-nowrap transition-all",
                  activePhaseFilter === phase
                    ? 'text-white'
                    : 'bg-secondary text-muted-foreground'
                )}
                style={activePhaseFilter === phase ? { backgroundColor: 'hsl(36 60% 31%)' } : undefined}
              >
                {phase === 'all' ? 'All' : phase.charAt(0).toUpperCase() + phase.slice(1)}
              </button>
            ))}
          </div>

          {/* Deliverable Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDeliverables.map((deliverable) => {
              const phaseFiles = getFilesForPhase(deliverable.phase)
              return (
                <DeliverableCardComponent
                  key={deliverable.id}
                  deliverable={deliverable}
                  onExpand={() => setExpandedDeliverable(deliverable)}
                  hasFiles={phaseFiles.length > 0}
                  onDownload={phaseFiles.length > 0 ? () => {
                    phaseFiles.forEach(f => handleFileDownload(f.file_url))
                  } : undefined}
                />
              )
            })}
          </div>

          {filteredDeliverables.length === 0 && (
            <div className="text-center py-16">
              <FiFileText className="w-8 h-8 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-sans">No deliverables in this category yet</p>
            </div>
          )}
        </main>
      </div>

      {/* Copilot FAB */}
      {!copilotOpen && (
        <button
          onClick={() => setCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-2xl shadow-black/40 flex items-center justify-center transition-all duration-300 hover:scale-105"
          style={{ backgroundColor: 'hsl(36 60% 31%)' }}
        >
          <FiMessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Copilot Panel */}
      <CopilotPanel
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        messages={chatMessages}
        inputValue={chatInput}
        onInputChange={setChatInput}
        onSend={handleCopilotSend}
        isLoading={chatLoading}
        mode={copilotMode}
        onModeChange={setCopilotMode}
        suggestions={chatSuggestions}
      />

      {/* Expanded Deliverable Modal */}
      <Dialog open={expandedDeliverable !== null} onOpenChange={(open) => { if (!open) setExpandedDeliverable(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-card">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3">
              {expandedDeliverable && (
                <div className="p-2 rounded-lg bg-secondary" style={{ color: PHASE_LABELS[expandedDeliverable.phase]?.color }}>
                  {expandedDeliverable.icon}
                </div>
              )}
              <div>
                <DialogTitle className="font-serif tracking-wide text-base">
                  {expandedDeliverable?.title ?? 'Deliverable'}
                </DialogTitle>
                <DialogDescription className="font-sans text-xs">
                  {expandedDeliverable ? PHASE_LABELS[expandedDeliverable.phase]?.label + ' Phase' : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 mt-4">
            <div className="pr-4 pb-4">
              {expandedDeliverable?.content ? renderMarkdown(expandedDeliverable.content) : (
                <p className="text-sm text-muted-foreground font-sans">No content available for this deliverable yet.</p>
              )}
            </div>
          </ScrollArea>
          {expandedDeliverable && getFilesForPhase(expandedDeliverable.phase).length > 0 && (
            <div className="flex-shrink-0 pt-3 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider">Files:</span>
                {getFilesForPhase(expandedDeliverable.phase).map((file, i) => (
                  <button
                    key={i}
                    onClick={() => handleFileDownload(file.file_url)}
                    className="flex items-center gap-1.5 text-xs font-sans px-2 py-1 rounded-md bg-secondary text-foreground hover:bg-muted transition-colors"
                  >
                    <FiDownload className="w-3 h-3" />
                    {file.name ?? `Download ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
