import { EloRating, ArenaMatch, ArenaVoteType } from '../types';
import { MOCK_MODELS } from '../data/mock';

const K_FACTOR = 32;
const DEFAULT_INITIAL_ELO = 1200;

export const INITIAL_ELO_RATINGS: Record<string, EloRating> = {
  'claude-sonnet': {
    modelId: 'claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    elo: 1285,
    matches: 42,
    wins: 29,
    losses: 8,
    ties: 5,
    winRate: 69.0,
    lastUpdated: new Date().toISOString(),
  },
  'gpt-5': {
    modelId: 'gpt-5',
    name: 'GPT-5 (4o)',
    provider: 'OpenAI',
    elo: 1272,
    matches: 38,
    wins: 25,
    losses: 9,
    ties: 4,
    winRate: 65.8,
    lastUpdated: new Date().toISOString(),
  },
  'gemini-pro': {
    modelId: 'gemini-pro',
    name: 'Gemini 2.5 Flash / Pro',
    provider: 'Google',
    elo: 1256,
    matches: 35,
    wins: 22,
    losses: 10,
    ties: 3,
    winRate: 62.9,
    lastUpdated: new Date().toISOString(),
  },
  'claude-opus': {
    modelId: 'claude-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    elo: 1240,
    matches: 24,
    wins: 14,
    losses: 8,
    ties: 2,
    winRate: 58.3,
    lastUpdated: new Date().toISOString(),
  },
  'gpt-5-mini': {
    modelId: 'gpt-5-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    elo: 1210,
    matches: 20,
    wins: 10,
    losses: 8,
    ties: 2,
    winRate: 50.0,
    lastUpdated: new Date().toISOString(),
  },
  'gemini-flash': {
    modelId: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    elo: 1235,
    matches: 26,
    wins: 15,
    losses: 9,
    ties: 2,
    winRate: 57.7,
    lastUpdated: new Date().toISOString(),
  },
};

/**
 * Calculates expected win probability for Model A against Model B.
 * Formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculates new ELO ratings and deltas after a head-to-head match.
 */
export function calculateNewElo(
  ratingA: number,
  ratingB: number,
  vote: ArenaVoteType,
  kFactor = K_FACTOR
): {
  newRatingA: number;
  newRatingB: number;
  deltaA: number;
  deltaB: number;
} {
  const expectedA = calculateExpectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;

  let actualA: number;
  let actualB: number;

  switch (vote) {
    case 'modelA':
      actualA = 1.0;
      actualB = 0.0;
      break;
    case 'modelB':
      actualA = 0.0;
      actualB = 1.0;
      break;
    case 'tie':
      actualA = 0.5;
      actualB = 0.5;
      break;
    case 'both_bad':
      // In LMSYS / Bradley-Terry benchmarks, both_bad is rating-neutral to prevent pool deflation
      return {
        newRatingA: ratingA,
        newRatingB: ratingB,
        deltaA: 0,
        deltaB: 0,
      };
  }

  const deltaA = Math.round(kFactor * (actualA - expectedA));
  const deltaB = Math.round(kFactor * (actualB - expectedB));

  return {
    newRatingA: Math.max(100, ratingA + deltaA),
    newRatingB: Math.max(100, ratingB + deltaB),
    deltaA,
    deltaB,
  };
}

/**
 * Updates model statistics and returns the refreshed EloRating object.
 */
export function updateModelStats(
  current: EloRating,
  newElo: number,
  outcome: 'win' | 'loss' | 'tie' | 'bad'
): EloRating {
  const matches = current.matches + 1;
  const wins = current.wins + (outcome === 'win' ? 1 : 0);
  const losses = current.losses + (outcome === 'loss' ? 1 : 0);
  const ties = current.ties + (outcome === 'tie' ? 1 : 0);
  const winRate = Math.round((wins / Math.max(1, matches)) * 1000) / 10;

  return {
    ...current,
    elo: newElo,
    matches,
    wins,
    losses,
    ties,
    winRate,
    lastUpdated: new Date().toISOString(),
  };
}
