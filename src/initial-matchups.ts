import { Matchup, TeamStandingWithDifficulty } from './simulator.js';

/**
 * 1v9, 2v10, 3v11, etc
 */
export const generateInitialMatchupsNew = (
  sortedGroup: TeamStandingWithDifficulty[]
): Matchup[] => {
  const matchups: Matchup[] = [];
  const halfSize = sortedGroup.length / 2;
  for (let i = 0; i < halfSize; i += 1) {
    const teamA = sortedGroup[i];
    const teamB = sortedGroup[i + halfSize];
    if (!teamA || !teamB) {
      throw new Error(`Missing team in initial matchup: ${i + 1} vs ${i + 1 + halfSize}`);
    }
    matchups.push({ teamA, teamB });
  }
  return matchups;
};

/**
 * 1v16, 2v15, 3v14, etc
 */
export const generateInitialMatchupsOriginal = (
  sortedGroup: TeamStandingWithDifficulty[]
): Matchup[] => {
  const matchups: Matchup[] = [];
  const halfSize = sortedGroup.length / 2;
  for (let i = 0; i < halfSize; i += 1) {
    const teamA = sortedGroup[i];
    const teamB = sortedGroup[sortedGroup.length - (1 + i)];
    if (!teamA || !teamB) {
      throw new Error(`Missing team in initial matchup: ${i + 1} vs ${i + 1 + halfSize}`);
    }
    matchups.push({ teamA, teamB });
  }
  return matchups;
};

export const generateInitialMatchups = generateInitialMatchupsNew;
// export const generateInitialMatchups = generateInitialMatchupsOriginal;
