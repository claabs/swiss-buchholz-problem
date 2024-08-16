import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { join } from 'node:path';

export interface Matchup {
  teamA: TeamStandingWithDifficulty;
  teamB: TeamStandingWithDifficulty;
}

export interface PastOpponentDetail {
  teamName: string;
  bestOf: 1 | 3;
  won: boolean;
}

export interface TeamStanding {
  name: string;
  seed: number;
  wins: number;
  losses: number;
  pastOpponents: PastOpponentDetail[];
}

export interface TeamStandingWithDifficulty extends TeamStanding {
  difficulty: number;
}

export interface QualElimOutput {
  qualified: TeamStanding[];
  eliminated: TeamStanding[];
  competitors: TeamStanding[];
}

export interface OpponentCounts {
  bo1: number;
  bo3: number;
  total: number;
  won: number;
}

export interface TeamResultCounts {
  qualified: number;
  allWins: number;
  allLosses: number;
  wins: number;
  losses: number;
  opponents: Map<string, OpponentCounts>;
}

export interface OpponentRate {
  teamName: string;
  totalRate: number;
  bo1Rate: number;
  bo3Rate: number;
  winRate: number;
}

export interface SimulationSettings {
  qualWins: number;
  elimLosses: number;
}

export interface TeamResults {
  teamName: string;
  rate: number;
  winRate: number;
  opponents?: OpponentRate[];
}

export interface SimulationResults {
  iterations: number;
  qualWins: number;
  elimLosses: number;
  qualified: TeamResults[];
  allWins: TeamResults[];
  allLosses: TeamResults[];
  failedSimulations: number;
  errorDetailsSet: Set<string>;
  roundDetailsSet: Set<string>;
}

export interface SimulationEventMessage {
  seedOrder: string[];
  simSettings: SimulationSettings;
  iterations: number;
}

export interface MessageFromWorkerFinish {
  data: Map<string, TeamResultCounts>;
  errors: number;
  type: 'finish';
}

export interface MessageFromWorkerProgress {
  data: number;
  type: 'progress';
}

export interface MessageFromWorkerErrorDetails {
  errorDetail: Set<string>;
  roundDetails: string;
  type: 'error';
}

export type MessageFromWorker =
  | MessageFromWorkerFinish
  | MessageFromWorkerProgress
  | MessageFromWorkerErrorDetails;

export const formatResultsCounts = (
  categorizedResults: Map<string, TeamResultCounts>,
  simSettings: SimulationSettings,
  iterations: number,
  failedSimulations: number,
  errorDetailsSet: Set<string>,
  roundDetailsSet: Set<string>
): SimulationResults => {
  const successfulIterations = iterations - failedSimulations;
  const { qualified, allWins, allLosses } = Array.from(categorizedResults.entries()).reduce(
    (acc, [teamName, resultCounts]) => {
      const formattedOpponents: OpponentRate[] = Array.from(
        resultCounts.opponents.entries(),
        ([oppTeam, oppCounts]) => ({
          teamName: oppTeam,
          totalRate: oppCounts.total / successfulIterations,
          bo1Rate: oppCounts.bo1 / successfulIterations,
          bo3Rate: oppCounts.bo3 / successfulIterations,
          winRate: oppCounts.won / oppCounts.total,
        })
      ).sort((a, b) => b.totalRate - a.totalRate);
      const winRate = resultCounts.wins / (resultCounts.wins + resultCounts.losses);
      if (resultCounts.qualified) {
        acc.qualified.push({
          teamName,
          rate: resultCounts.qualified / successfulIterations,
          opponents: formattedOpponents,
          winRate,
        });
      }
      if (resultCounts.allWins) {
        acc.allWins.push({
          teamName,
          rate: resultCounts.allWins / successfulIterations,
          opponents: formattedOpponents,
          winRate,
        });
      }
      if (resultCounts.allLosses) {
        acc.allLosses.push({
          teamName,
          rate: resultCounts.allLosses / successfulIterations,
          opponents: formattedOpponents,
          winRate,
        });
      }

      return acc;
    },
    { qualified: [] as TeamResults[], allWins: [] as TeamResults[], allLosses: [] as TeamResults[] }
  );

  return {
    qualified: qualified.sort((a, b) => b.rate - a.rate),
    allWins: allWins.sort((a, b) => b.rate - a.rate),
    allLosses: allLosses.sort((a, b) => b.rate - a.rate),
    iterations,
    ...simSettings,
    failedSimulations,
    errorDetailsSet,
    roundDetailsSet,
  };
};

export const simulateEvents = async (
  seedOrder: string[],
  simSettings: SimulationSettings,
  progress: (pct: number) => void,
  iterations = 10000
): Promise<SimulationResults> => {
  const workerCount = cpus().length;
  const iterationsPerWorker = Math.floor(iterations / workerCount);
  const runningWorkers: Promise<MessageFromWorkerFinish>[] = [];
  const errorDetailsSet = new Set<string>();
  const roundDetailsSet = new Set<string>();
  let progressTotal = 0;
  for (let i = 0; i < workerCount; i += 1) {
    // eslint-disable-next-line @typescript-eslint/no-loop-func
    const promise = new Promise<MessageFromWorkerFinish>((resolve, reject) => {
      const message: SimulationEventMessage = {
        seedOrder,
        simSettings,
        iterations: iterationsPerWorker,
      };
      const workerFile = join(import.meta.dirname, '/worker/simulation-worker.js');
      const worker = new Worker(workerFile, { workerData: message });
      worker.on('message', (data: MessageFromWorker) => {
        if (data.type === 'finish') {
          resolve(data);
        } else if (data.type === 'error') {
          errorDetailsSet.add(Array.from(data.errorDetail).sort().join(','));
          roundDetailsSet.add(data.roundDetails);
        } else {
          progressTotal += data.data;
          progress(progressTotal / iterations);
        }
      });
      worker.on('error', (error) => {
        reject(error);
      });
    });
    runningWorkers.push(promise);
  }
  const allTeamResults = new Map<string, TeamResultCounts>();
  let failedSimulations = 0;
  const workerResults = await Promise.all(runningWorkers);
  workerResults.forEach((workerResult) => {
    failedSimulations += workerResult.errors;
    workerResult.data.forEach((teamCounts, teamName) => {
      const prevTotal = allTeamResults.get(teamName);
      if (!prevTotal) {
        allTeamResults.set(teamName, teamCounts);
      } else {
        const newOpponents = new Map<string, OpponentCounts>();
        teamCounts.opponents.forEach((opponentCounts, opponentName) => {
          const prevOpponent = prevTotal.opponents.get(opponentName);
          if (!prevOpponent) {
            newOpponents.set(opponentName, opponentCounts);
          } else {
            const newOpponentCounts: OpponentCounts = {
              total: prevOpponent.total + opponentCounts.total,
              won: prevOpponent.won + opponentCounts.won,
              bo1: prevOpponent.bo1 + opponentCounts.bo1,
              bo3: prevOpponent.bo3 + opponentCounts.bo3,
            };
            newOpponents.set(opponentName, newOpponentCounts);
          }
        });
        const newTotal: TeamResultCounts = {
          qualified: prevTotal.qualified + teamCounts.qualified,
          allWins: prevTotal.allWins + teamCounts.allWins,
          allLosses: prevTotal.allLosses + teamCounts.allLosses,
          wins: prevTotal.wins + teamCounts.wins,
          losses: prevTotal.losses + teamCounts.losses,
          opponents: newOpponents,
        };
        allTeamResults.set(teamName, newTotal);
      }
    });
  });

  return formatResultsCounts(
    allTeamResults,
    simSettings,
    iterations,
    failedSimulations,
    errorDetailsSet,
    roundDetailsSet
  );
};
