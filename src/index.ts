import { simulateEvents } from './simulator.js';
import { writeFileSync } from 'node:fs';
import * as Combinatorics from 'js-combinatorics';
// import fastCartesian from 'fast-cartesian';

const main = async () => {
  const seedOrder = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
  ];
  const results = await simulateEvents(seedOrder, { elimLosses: 3, qualWins: 3 }, () => {}, 600000);
  console.log('Unique error scenarios:', results.errorDetailsSet.size);
  const formattedErrorList = Array.from(results.errorDetailsSet)
    .sort()
    .map((line) => line.split(','));
  writeFileSync('output/error-scenarios.json', JSON.stringify(formattedErrorList, null, 2));

  const header = `nm\tdif\tsd\trecord\n`;
  const roundDetailsSet = Array.from(results.roundDetailsSet);
  let roundDetailsList = roundDetailsSet.join(`\n\n${header}`);
  roundDetailsList = `${header}${roundDetailsList}`;
  writeFileSync('output/round-details-scenarios.txt', roundDetailsList);

  const errorsCounts = new Map<string, number>();
  results.errorDetailsSet.forEach((errorDetail) => {
    errorDetail.split(',').forEach((matchup) => {
      const lineCount = errorsCounts.get(matchup) ?? 0;
      errorsCounts.set(matchup, lineCount + 1);
    });
  });
  const sortedEntries = Array.from(errorsCounts.entries()).sort((a, b) => b[1] - a[1]);
  writeFileSync('output/matchup-counts.json', JSON.stringify(sortedEntries, null, 2));

  const subsetCounts = new Map<string, number>();
  formattedErrorList.forEach((list) => {
    // Generate all subsets of all sizes
    for (let size = 1; size <= list.length; size++) {
      const combinations = new Combinatorics.Combination(list, size);
      combinations.toArray().forEach((subset) => {
        const key = subset.sort().join(',');
        const subsetCount = subsetCounts.get(key) ?? 0;
        subsetCounts.set(key, subsetCount + 1);
      });
    }
  });

  console.log('Total unique subsets:', subsetCounts.size);

  console.log('grouping by size');
  const groupedBySize: Record<string, { key: string; count: number }[]> = {};
  Array.from(subsetCounts.entries()).forEach(([key, count]) => {
    const size = key.split(',').length;
    if (!groupedBySize[size]) {
      groupedBySize[size] = [];
    }
    groupedBySize[size].push({ key, count });
  });

  // Sort each group by count and pick the top 10
  const topSubsetsBySize: Record<string, { key: string; count: number }[]> = {};
  Object.keys(groupedBySize).forEach((size) => {
    if (groupedBySize[size]) {
      groupedBySize[size].sort((a, b) => b.count - a.count);
      topSubsetsBySize[size] = groupedBySize[size].slice(0, 10);
    }
  });

  writeFileSync('output/top-subsets.json', JSON.stringify(topSubsetsBySize, null, 2));

  topSubsetsBySize[4]?.forEach((subset) => {
    const subsetList = subset.key.split(',');
    const exampleRound = roundDetailsSet.find((detail) => {
      return subsetList.every((matchup) => detail.includes(matchup));
    });
    if (exampleRound) console.log(`${subset.key}: ${subset.count}\n${header}${exampleRound}\n`);
  });
  console.log('See output folder for a ton more data');
};

main().catch((err) => console.error(err));
