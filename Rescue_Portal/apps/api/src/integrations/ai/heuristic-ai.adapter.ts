import { Injectable } from '@nestjs/common';
import { CAPABILITY_CATALOG, capabilityLabel } from '../../common/constants/capabilities';
import type {
  AiProvider,
  CapabilitySuggestion,
  CapabilitySuggestionResult,
  HospitalRankingCandidate,
  HospitalRankingInput,
  HospitalRankingResult,
  IncidentSummaryResult,
  RecommendationExplanationInput,
  RecommendationExplanationResult,
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
  { pattern: /\bunconscious|unresponsive|coma\b/i, codes: ['BED_ICU', 'EQUIP_VENTILATOR', 'SERVICE_EMERGENCY_DEPARTMENT'] },
  { pattern: /\bbleeding|haemorrhage|hemorrhage\b/i, codes: ['BLOOD_O_NEG', 'SURGICAL_OPERATING_ROOM', 'SPECIALIST_GENERAL_SURGERY'] },
  { pattern: /\bchest pain|heart attack|myocardial|cardiac arrest\b/i, codes: ['SPECIALIST_CARDIOLOGY', 'BED_ICU'] },
  { pattern: /\bfracture|broken bone|head injury|accident|collision\b/i, codes: ['SPECIALIST_ORTHOPEDICS', 'EQUIP_CT_SCANNER', 'SURGICAL_OPERATING_ROOM'] },
  { pattern: /\bpregnan|labour|labor|delivery\b/i, codes: ['SPECIALIST_OBSTETRICS', 'SURGICAL_OPERATING_ROOM'] },
  { pattern: /\bchild|infant|baby|paediatric|pediatric\b/i, codes: ['SPECIALIST_PEDIATRICS', 'BED_ICU'] },
  { pattern: /\bnewborn|neonatal\b/i, codes: ['SPECIALIST_PEDIATRICS', 'BED_ICU'] },
  { pattern: /\bburn|scald\b/i, codes: ['BED_ICU', 'EQUIP_VENTILATOR'] },
  { pattern: /\bstroke\b/i, codes: ['EQUIP_CT_SCANNER', 'BED_ICU'] },
  { pattern: /\bbrain injury|neurosurgery\b/i, codes: ['SPECIALIST_NEUROSURGERY', 'EQUIP_CT_SCANNER', 'BED_ICU'] },
  { pattern: /\bventilat|breathless|difficulty breathing\b/i, codes: ['EQUIP_VENTILATOR', 'BED_ICU'] },
  { pattern: /\bdialysis|renal|kidney failure\b/i, codes: ['EQUIP_DIALYSIS'] },
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function matchesAlias(text: string, alias: string): boolean {
  const escaped = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
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
        if (b.score !== a.score) return b.score - a.score;
        const etaA = a.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        const etaB = b.etaMinutes ?? Number.MAX_SAFE_INTEGER;
        if (etaA !== etaB) return etaA - etaB;
        const distanceA = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const distanceB = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
        if (distanceA !== distanceB) return distanceA - distanceB;
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
