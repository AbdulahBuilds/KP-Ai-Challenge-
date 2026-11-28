import { Injectable } from '@nestjs/common';
import { CAPABILITY_CODES, CAPABILITY_CATALOG, capabilityLabel } from '../../common/constants/capabilities';
import type {
  AiProvider,
  CapabilitySuggestion,
  CapabilitySuggestionResult,
  DetectedEmergencyType,
  DetectedGender,
  DetectedSeverity,
  HospitalRankingCandidate,
  HospitalRankingInput,
  HospitalRankingResult,
  IncidentSummaryResult,
  IncidentNarrativeLanguage,
  RecommendationExplanationInput,
  RecommendationExplanationResult,
  StructuredIncidentNarrativeResult,
} from './ai.types';
import { AI_DISCLAIMER } from './ai.types';

/**
 * Hints are restricted to capability codes the Hospital Portal actually reports.
 * A hospital is never marked ELIGIBLE for a capability the portal did not confirm.
 */
const EMERGENCY_TYPE_HINTS: Record<string, string[]> = {
  CARDIAC: ['SERVICE_EMERGENCY_DEPARTMENT', 'SPECIALIST_CARDIOLOGY', 'BED_ICU'],
  TRAUMA: [
    'SERVICE_EMERGENCY_DEPARTMENT',
    'SURGICAL_OPERATING_ROOM',
    'SPECIALIST_GENERAL_SURGERY',
    'SPECIALIST_ORTHOPEDICS',
    'BED_ICU',
    'BLOOD_O_NEG',
    'EQUIP_CT_SCANNER',
  ],
  BURNS: ['SERVICE_EMERGENCY_DEPARTMENT', 'BED_ICU', 'EQUIP_VENTILATOR'],
  RESPIRATORY: ['SERVICE_EMERGENCY_DEPARTMENT', 'EQUIP_VENTILATOR', 'BED_ICU', 'EQUIP_XRAY'],
  OBSTETRIC: [
    'SERVICE_EMERGENCY_DEPARTMENT',
    'SPECIALIST_OBSTETRICS',
    'SURGICAL_OPERATING_ROOM',
    'BLOOD_O_NEG',
  ],
  PEDIATRIC: ['SERVICE_EMERGENCY_DEPARTMENT', 'SPECIALIST_PEDIATRICS', 'BED_ICU'],
  NEONATAL: ['SERVICE_EMERGENCY_DEPARTMENT', 'SPECIALIST_PEDIATRICS', 'BED_ICU'],
  PSYCHIATRIC: ['SERVICE_EMERGENCY_DEPARTMENT'],
  MEDICAL: ['SERVICE_EMERGENCY_DEPARTMENT'],
};

const KEYWORD_HINTS: { pattern: RegExp; codes: string[] }[] = [
  { pattern: /\bunconscious|unresponsive|coma|behosh|bayhosh|hosh nahi|بې\s*هوښه|بېهوښه\b/iu, codes: ['BED_ICU', 'EQUIP_VENTILATOR', 'SERVICE_EMERGENCY_DEPARTMENT'] },
  { pattern: /\bbleeding|haemorrhage|hemorrhage|khoon beh|zyada khoon\b|وینه\s*(?:تویېدنه|بهېدل)|وینه‌بهېدل/iu, codes: ['BLOOD_O_NEG', 'SURGICAL_OPERATING_ROOM', 'SPECIALIST_GENERAL_SURGERY'] },
  { pattern: /\bchest pain|heart attack|myocardial|cardiac arrest|seene mein dard|seene me dard|dil ka dora\b|زړه\s*حمله|د\s*سینې\s*درد/iu, codes: ['SPECIALIST_CARDIOLOGY', 'BED_ICU'] },
  { pattern: /\bfracture|broken bone|head injury|accident|collision|haddi toot|haddi tut|zakhm|chot\b|ټپي|ټپ|مات\s*شوی\s*هډوکی/iu, codes: ['SPECIALIST_ORTHOPEDICS', 'EQUIP_CT_SCANNER', 'SURGICAL_OPERATING_ROOM'] },
  { pattern: /\bpregnan|labour|labor|delivery|hamal|hamila|zachgi\b|امیندواره|زېږون|زیږون/iu, codes: ['SPECIALIST_OBSTETRICS', 'SURGICAL_OPERATING_ROOM'] },
  { pattern: /\bchild|infant|baby|paediatric|pediatric|bacha|bachi|nawazida\b|ماشوم|نوی\s*زېږېدلی/iu, codes: ['SPECIALIST_PEDIATRICS', 'BED_ICU'] },
  { pattern: /\bnewborn|neonatal\b/i, codes: ['SPECIALIST_PEDIATRICS', 'BED_ICU'] },
  { pattern: /\bburn|scald|jal gaya|jalna\b|سوځېدلی|سوځېدنه/iu, codes: ['BED_ICU', 'EQUIP_VENTILATOR'] },
  { pattern: /\bstroke|falij\b|فلج/iu, codes: ['EQUIP_CT_SCANNER', 'BED_ICU'] },
  { pattern: /\bbrain injury|neurosurgery\b/i, codes: ['SPECIALIST_NEUROSURGERY', 'EQUIP_CT_SCANNER', 'BED_ICU'] },
  { pattern: /\bventilat|breathless|difficulty breathing|saans nahi|saans lene mein\b|ساه\s*تنګي|ساه\s*نه\s*شي\s*اخیستلای/iu, codes: ['EQUIP_VENTILATOR', 'BED_ICU'] },
  { pattern: /\bdialysis|renal|kidney failure|gurda\b|پښتورګي|د\s*پښتورګو\s*ناکامي/iu, codes: ['EQUIP_DIALYSIS'] },
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

const URDU_ROMAN_MAP: Record<string, string> = {
  'ا': 'a', 'آ': 'aa', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ڈ': 'd', 'ذ': 'z', 'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f',
  'ق': 'q', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n', 'و': 'o', 'ہ': 'h',
  'ھ': 'h', 'ء': '', 'ئ': 'i', 'ی': 'i', 'ے': 'e', 'ؤ': 'o', 'ۃ': 't', 'ٰ': 'a', 'ـ': '',
  'َ': 'a', 'ِ': 'i', 'ُ': 'u', 'ّ': '', 'ْ': '',
};

const URDU_WORD_ROMAN_MAP: Record<string, string> = {
  'مریض': 'mareez',
  'ہوش': 'hosh',
  'بےہوش': 'behosh',
  'بے': 'be',
  'چوٹ': 'chot',
  'زخم': 'zakhm',
  'خون': 'khoon',
  'بہہ': 'beh',
  'رہا': 'raha',
  'ہے': 'hai',
  'ہیں': 'hain',
  'درد': 'dard',
  'سینے': 'seenay',
  'سانس': 'saans',
  'نہیں': 'nahi',
  'بخار': 'bukhar',
  'علاج': 'ilaaj',
  'دیا': 'diya',
  'گیا': 'gaya',
  'دیں': 'dein',
  'آکسیجن': 'oxygen',
  'اکسیجن': 'oxygen',
  'دوا': 'dawa',
  'پٹی': 'patti',
  'مستحکم': 'mustahkam',
  'حالت': 'halat',
  'تشویشناک': 'tashweeshnaak',
  'حملہ': 'hamla',
  'دل': 'dil',
  'ٹوٹ': 'toot',
  'جل': 'jal',
  'اور': 'aur',
  'ایک': 'aik',
  'بچہ': 'bacha',
  'گرنے': 'girnay',
  'سے': 'se',
  'پر': 'par',
  'میں': 'mein',
  'کو': 'ko',
  'کی': 'ki',
  'کا': 'ka',
  'کے': 'kay',
};

export function romanizeUrdu(text: string): string {
  return text.replace(/[\p{Letter}\p{Mark}]+/gu, (word) => {
    const knownWord = URDU_WORD_ROMAN_MAP[word];
    if (knownWord) return knownWord;
    return [...word].map((character) => URDU_ROMAN_MAP[character] ?? character).join('');
  });
}

function containsAny(text: string, terms: string[]): boolean {
  const normalised = normalise(text);
  return terms.some((term) => normalised.includes(term));
}

function matchesAlias(text: string, alias: string): boolean {
  const escaped = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

function cleanExtracted(value: string | undefined, maxLength = 120): string | null {
  const cleaned = (value ?? '')
    .replace(/^[\s:,\-–—]+/, '')
    .replace(/[\s:,\-–—]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned && cleaned.length <= maxLength ? cleaned : null;
}

export function detectNarrativeLanguage(text: string): IncidentNarrativeLanguage {
  if (/[\u0600-\u06FF]/.test(text)) {
    return /[ځڅډړږژښګڼ]|\b(?:څوک|څه|ۍ|خو)\b/.test(text) ? 'ps' : 'ur';
  }
  return /\b(?:mareez|behosh|hosh|chot|dard|saans|ilaaj|ilaj|dawa|naam|umr|saal|aurat|mard)\b/i.test(text)
    ? 'ur'
    : 'en';
}

const EMERGENCY_TYPE_PATTERNS: Array<{ type: DetectedEmergencyType; pattern: RegExp }> = [
  { type: 'MASS_CASUALTY', pattern: /\b(?:mass casualty|multiple (?:patients|casualties)|many injured|several patients)\b/iu },
  { type: 'TRAUMA', pattern: /\b(?:accident|collision|trauma|fracture|wound|injury|injured|chot|zakhm|ټپي|زخم)\b/iu },
  { type: 'BURNS', pattern: /\b(?:burns?|scald|jal gaya|سوځېد)\b/iu },
  { type: 'OBSTETRIC', pattern: /\b(?:pregnan\w*|labour|labor|delivery|hamila|zachgi|امیندواره|زېږون)\b/iu },
  { type: 'NEONATAL', pattern: /\b(?:newborn|neonatal|نوی زېږېدلی)\b/iu },
  { type: 'PEDIATRIC', pattern: /\b(?:child|children|baby|infant|pediatric|paediatric|bacha|bachi|ماشوم)\b/iu },
  { type: 'PSYCHIATRIC', pattern: /\b(?:psychiatric|mental health|suicide|depression)\b/iu },
  { type: 'CARDIAC', pattern: /\b(?:heart attack|cardiac|chest pain|dil ka dora|seene mein dard|زړه حمله|د سینې درد)\b/iu },
  { type: 'RESPIRATORY', pattern: /\b(?:breathless|breathing|asthma|respiratory|saans|ساه تنګي|ساه نه)\b/iu },
];

const SEVERITY_PATTERNS: Array<{ severity: DetectedSeverity; pattern: RegExp }> = [
  {
    severity: 'CRITICAL',
    pattern: /\b(?:cardiac arrest|unconscious|unresponsive|not breathing|severe bleeding|critical|behosh|bayhosh|بې هوښه|بېهوښه)\b/iu,
  },
  {
    severity: 'HIGH',
    pattern: /\b(?:chest pain|difficulty breathing|breathless|active bleeding|fracture|stroke|high priority|dard|saans|درد)\b/iu,
  },
  { severity: 'LOW', pattern: /\b(?:minor|stable|low priority|\blow\b|مستحکم)\b/iu },
];

function extractPatientName(text: string): string | null {
  const patterns = [
    /\b(?:patient(?:\s+name)?|name)\s*(?:is|:|=)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
    /\b(?:mareez|mareezah)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
    /\b(?:mareez\s*(?:ka\s*)?naam|naam)\s*(?:hai|is|:|=)?\s*([^\n.!?،۔]{2,60})/iu,
    /(?:ناروغ|مریض)\s*(?:ناو|نام|نوم)\s*(?:دی|hai|:|=)?\s*([^\n.!?،۔]{2,60})/iu,
    /(?:ناروغ|مریض)\s+([آ-ی]{2,30}(?:\s+[آ-ی]{2,30}){0,2})/u,
  ];
  for (const pattern of patterns) {
    const name = cleanExtracted(text.match(pattern)?.[1], 60);
    if (name && !/^(?:the|patient|name|mareez|ناروغ|مریض)\b/iu.test(name)) return name;
  }
  return null;
}

function extractAge(text: string): number | null {
  const patterns = [
    /\bage\s*(?:is|:|=)?\s*(\d{1,3})\b/iu,
    /\b(\d{1,3})\s*(?:years?\s*old|year\s*old|yrs?|saal|sal)\b/iu,
    /\b(?:umr|عمر)\s*(?:is|:|=)?\s*(\d{1,3})\b/iu,
  ];
  for (const pattern of patterns) {
    const value = Number(text.match(pattern)?.[1]);
    if (Number.isInteger(value) && value >= 0 && value <= 130) return value;
  }
  return null;
}

function extractGender(text: string): DetectedGender | null {
  if (/\b(?:female|woman|lady|girl|aurat|عورت|ښځه|نجلۍ)\b/iu.test(text)) return 'FEMALE';
  if (/\b(?:male|man|boy|mard|مرد|سړی|هلک)\b/iu.test(text)) return 'MALE';
  return null;
}

function extractEmergencyType(text: string): DetectedEmergencyType {
  for (const candidate of EMERGENCY_TYPE_PATTERNS) {
    if (candidate.pattern.test(text)) return candidate.type;
  }
  return 'MEDICAL';
}

function extractSeverity(text: string): DetectedSeverity {
  for (const candidate of SEVERITY_PATTERNS) {
    if (candidate.pattern.test(text)) return candidate.severity;
  }
  return 'MODERATE';
}

function extractAddress(text: string): string | null {
  const patterns = [
    /\b(?:address|location|near|at)\s*(?:is|:|=)?\s*([^\n.!?،۔]{3,120})/iu,
    /(?:پته|ځای)\s*(?:دی|:|=)?\s*([^\n.!?،۔]{3,120})/iu,
  ];
  for (const pattern of patterns) {
    const address = cleanExtracted(text.match(pattern)?.[1], 120);
    if (address && !/^\d+(?:\.\d+)?[, ]+\d+(?:\.\d+)?$/u.test(address)) return address;
  }
  return null;
}

/**
 * Deterministic, offline capability matcher. It is transparent and testable;
 * it is deliberately conservative and never replaces human judgement.
 */
@Injectable()
export class HeuristicAiAdapter implements AiProvider {
  readonly name = 'heuristic';

  async suggestCapabilities(text: string): Promise<CapabilitySuggestionResult> {
    const normalised = normalise(text);
    const scores = new Map<string, { confidence: number; terms: Set<string> }>();
    const add = (code: string, confidence: number, term: string) => {
      const current = scores.get(code) ?? { confidence: 0, terms: new Set<string>() };
      current.confidence = Math.max(current.confidence, confidence);
      current.terms.add(term);
      scores.set(code, current);
    };

    for (const definition of CAPABILITY_CATALOG) {
      for (const alias of definition.aliases) {
        if (alias.length < 4) continue;
        if (matchesAlias(normalised, alias)) add(definition.code, 0.72, alias);
      }
    }
    for (const [type, codes] of Object.entries(EMERGENCY_TYPE_HINTS)) {
      if (matchesAlias(normalised, type.toLowerCase())) {
        for (const code of codes) add(code, 0.55, type.toLowerCase());
      }
    }
    for (const hint of KEYWORD_HINTS) {
      if (hint.pattern.test(text)) {
        for (const code of hint.codes) add(code, 0.65, hint.pattern.source.replace(/\\b/g, '').replace(/[|]/g, ' / '));
      }
    }
    if (normalised.length > 0 && !scores.has('SERVICE_EMERGENCY_DEPARTMENT')) {
      add('SERVICE_EMERGENCY_DEPARTMENT', 0.4, 'emergency case');
    }

    const suggestions: CapabilitySuggestion[] = [...scores.entries()]
      .map(([code, value]) => ({
        code,
        label: capabilityLabel(code),
        confidence: Math.round(value.confidence * 100) / 100,
        matchedTerms: [...value.terms],
      }))
      .sort((a, b) => b.confidence - a.confidence || a.code.localeCompare(b.code))
      .slice(0, 14);
    return {
      suggestions,
      source: 'heuristic',
      isAiAssisted: true,
      disclaimer: `${AI_DISCLAIMER} Matching is heuristic and may miss or over-suggest capabilities.`,
    };
  }

  async summarizeIncident(text: string): Promise<IncidentSummaryResult> {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) {
      return {
        summary: 'No clinical or incident text was supplied to summarise.',
        source: 'heuristic',
        isAiAssisted: true,
        disclaimer: AI_DISCLAIMER,
      };
    }
    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    const summary = sentences.slice(0, 3).join(' ').slice(0, 600);
    return {
      summary: summary.length < cleaned.length ? `${summary}${summary.endsWith('.') ? '' : '.'}` : summary,
      source: 'heuristic',
      isAiAssisted: true,
      disclaimer: `${AI_DISCLAIMER} This is an extractive summary, not a diagnosis.`,
    };
  }

  async structureIncidentNarrative(
    transcript: string,
    language: IncidentNarrativeLanguage = 'en',
  ): Promise<StructuredIncidentNarrativeResult> {
    const normalizedTranscript = (language === 'ur' ? romanizeUrdu(transcript) : transcript)
      .replace(/\s+/g, ' ')
      .trim();
    const fields = {
      symptoms: [] as string[],
      injuries: [] as string[],
      suspectedCondition: [] as string[],
      treatmentProvided: [] as string[],
      notes: [] as string[],
      resourceNeeds: [] as string[],
    };
    const sentences = normalizedTranscript.split(/(?<=[.!?؟۔])\s+|[\n;]+/).filter(Boolean);

    for (const sentence of sentences) {
      let classified = false;
      const add = (field: keyof typeof fields) => {
        fields[field].push(sentence.trim());
        classified = true;
      };
      if (containsAny(sentence, ['pain', 'fever', 'cough', 'breathless', 'symptom', 'dard', 'saans', 'bukhar', 'nishani', 'درد', 'تبه', 'ټوخی', 'ساه', 'نښې'])) {
        add('symptoms');
      }
      if (containsAny(sentence, ['injury', 'injuries', 'wound', 'fracture', 'cut', 'burn', 'bleed', 'trauma', 'zakhm', 'chot', 'zakham', 'ټپي', 'ټپ', 'زخم', 'مات هډوکی', 'سوځېدلی', 'وینه'])) {
        add('injuries');
      }
      if (containsAny(sentence, ['condition', 'conscious', 'unconscious', 'unresponsive', 'stable', 'critical', 'halat', 'behosh', 'hosh', 'حالت', 'هوښیار', 'بېهوښه', 'ناکرار'])) {
        add('suspectedCondition');
      }
      if (containsAny(sentence, ['treatment', 'treated', 'administered', 'provided', 'first aid', 'medication', 'medicine', 'bandage', 'dawa', 'ilaaj', 'ilaj', 'alaj', 'درملنه', 'درمل', 'اکسیجن ورکړل'])) {
        add('treatmentProvided');
      }
      if (containsAny(sentence, ['ventilator', 'icu', 'equipment', 'facility', 'blood bank', 'dialysis', 'oxygen', 'resource', 'وینټیلیټر', 'د وینې بانک', 'اکسیجن', 'ډایالیز'])) {
        add('resourceNeeds');
      }
      if (!classified) fields.notes.push(sentence.trim());
    }

    const suggestions = (await this.suggestCapabilities(normalizedTranscript)).suggestions;
    const emergencyType = extractEmergencyType(normalizedTranscript);
    const typeHints = EMERGENCY_TYPE_HINTS[emergencyType] ?? [];
    const specificCapabilities = suggestions
      .filter(
        (suggestion) =>
          suggestion.code !== 'SERVICE_EMERGENCY_DEPARTMENT' &&
          CAPABILITY_CODES.has(suggestion.code) &&
          (suggestion.confidence >= 0.65 || typeHints.includes(suggestion.code)),
      )
      .slice(0, 2)
      .map((suggestion) => suggestion.code);
    const capabilities = [...new Set(['SERVICE_EMERGENCY_DEPARTMENT', ...specificCapabilities])];

    return {
      normalizedTranscript,
      symptoms: fields.symptoms.join(' '),
      injuries: fields.injuries.join(' '),
      suspectedCondition: fields.suspectedCondition.join(' '),
      treatmentProvided: fields.treatmentProvided.join(' '),
      notes: fields.notes.join(' '),
      resourceNeeds: fields.resourceNeeds.join(' '),
      patientName: extractPatientName(normalizedTranscript),
      age: extractAge(normalizedTranscript),
      gender: extractGender(normalizedTranscript),
      emergencyType,
      severity: extractSeverity(normalizedTranscript),
      address: extractAddress(normalizedTranscript),
      capabilities,
      source: 'heuristic',
      isAiAssisted: false,
      disclaimer: `${AI_DISCLAIMER} Narrative organization is rule-based and may miss details; review every field.`,
    };
  }

  async explainRecommendation(input: RecommendationExplanationInput): Promise<RecommendationExplanationResult> {
    const distance =
      input.distanceKm === null
        ? 'distance is unknown'
        : `about ${input.distanceKm.toFixed(1)} km away${input.etaMinutes ? ` (~${input.etaMinutes} min travel estimate)` : ''}`;
    const confirmed = input.matchedCapabilities.length
      ? `Confirmed capabilities: ${input.matchedCapabilities.join(', ')}.`
      : 'No required capabilities were confirmed as available.';
    const missing = input.missingCapabilities.length
      ? ` Missing or unavailable: ${input.missingCapabilities.join(', ')}.`
      : '';
    const unknown = input.unknownCapabilities.length
      ? ` Not confirmed (unknown): ${input.unknownCapabilities.join(', ')}.`
      : '';
    const dataWarning = input.isMock ? ' Data source is MOCK; this is not real hospital capacity.' : '';
    return {
      text: `${input.hospitalName} is ${input.eligibility.toLowerCase()} under policy ${input.policyVersion} and ${distance}. Capability data is ${input.freshnessStatus.toLowerCase()}: ${input.freshnessReason}. ${confirmed}${missing}${unknown} Score ${input.score.toFixed(1)}.${dataWarning}`,
      source: 'heuristic',
      isAiAssisted: true,
      disclaimer: `${AI_DISCLAIMER} Recommendations support, and do not replace, the dispatcher's decision.`,
    };
  }

  async rankHospitals(input: HospitalRankingInput): Promise<HospitalRankingResult> {
    const eligible = input.candidates
      .filter((candidate) => candidate.eligibility === 'ELIGIBLE')
      .slice()
      .sort((a, b) => {
        const distanceA = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const distanceB = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        if (distanceA !== distanceB) return distanceA - distanceB;
        if (b.score !== a.score) return b.score - a.score;
        const etaA = a.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        const etaB = b.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        if (etaA !== etaB) return etaA - etaB;
        return a.hospitalName.localeCompare(b.hospitalName);
      });

    const rationaleById: Record<string, string> = {};
    for (const candidate of eligible) {
      const confirmed = candidate.capabilityEvaluations
        .filter((evaluation) => evaluation.status === 'AVAILABLE')
        .map((evaluation) => {
          const quantity = typeof evaluation.quantity === 'number' ? ` (${evaluation.quantity} available)` : '';
          const note = evaluation.note ? `; ${evaluation.note}` : '';
          return `${capabilityLabel(evaluation.code)}${quantity}${note}`;
        });
      const travel = candidate.etaMinutes !== null ? `${candidate.etaMinutes} min ETA` : 'ETA unavailable';
      const distance = candidate.distanceKm !== null ? `${candidate.distanceKm.toFixed(1)} km away` : 'distance unavailable';
      rationaleById[candidate.hospitalExternalId] =
        `Best match from current hospital portal data: ${confirmed.join(', ') || 'no required capabilities listed'} confirmed. ${travel}, ${distance}.`;
    }

    const orderedHospitalIds = eligible.map((candidate) => candidate.hospitalExternalId);
    const suggestedHospitalId = orderedHospitalIds[0] ?? null;
    const suggested = eligible.find((candidate) => candidate.hospitalExternalId === suggestedHospitalId);
    const summary = suggested
      ? `AI suggests ${suggested.hospitalName} first, based on ${eligible.length} eligible hospital(s) with fresh capability data from the hospital portal. A rescue admin must still confirm the destination.`
      : 'No hospital currently meets all required capabilities on fresh hospital portal data. Review unconfirmed results and contact hospitals directly.';

    return {
      orderedHospitalIds,
      suggestedHospitalId,
      summary,
      rationaleById,
      source: 'heuristic',
      isAiAssisted: true,
      disclaimer: `${AI_DISCLAIMER} The safety gate is rule-based; AI only orders hospitals that already passed it.`,
    };
  }
}
