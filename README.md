# The 2024 Copenhagen Major Swiss Flaw

## The Problem

With the introduction of the new [Initial Swiss Matchups rule](https://github.com/ValveSoftware/counter-strike_rules_and_regs/blob/main/major-supplemental-rulebook.md?plain=1#L324-L335) added for the 2024 Copenhagen Major cycle, an unintended consequence was created.

With all matchups 50/50, there's about 0.6% chance that 1-1 record teams in round 3 cannot find valid matchups. It can cause the round 3 matchups selection to force a rematch, which is not allowed by the [current ruleset](https://github.com/ValveSoftware/counter-strike_rules_and_regs/blob/main/major-supplemental-rulebook.md?plain=1#L303):

 >In round 2 and 3, the highest seeded team faces the lowest seeded team available that does not result in a rematch within the stage.

There's no clarity in the ruleset how this matchup problem should be resolved, so those simulated event failures are excluded from the results.

## Example Matchups

Here's an example round 3 1-1 matchup pool, ordered by difficulty then initial seed:

| Team | Difficulty | Seed | Previous Opponents |
|------|------------|------|--------------------|
| 1    | 2          | 1    | 1>9, 16>1          |
| 5    | 2          | 5    | 5>13, 12>5         |
| 7    | 2          | 7    | 7>15, 10>7         |
| 11   | 2          | 11   | 11>3, 6>11         |
| 3    | -2         | 3    | 11>3, 3>14         |
| 9    | -2         | 9    | 1>9, 9>8           |
| 13   | -2         | 13   | 5>13, 13>4         |
| 15   | -2         | 15   | 7>15, 15>2         |


The matchups are created from highest seed first, picking the lowest seed that doesn't result in a rematch:

- *1* is top seed, so they pair with the bottom seed *15* first
- *5* is next highest seed, but already played *14*, so they pair with the next lowest seed, which is *9*
- *7* is next highest seed, and pair with the lowest seed, which is *13*
- ***11* and *3* remain, but they already played round 1. Here lies the issue.**

| Team A | Team B |
|--------|--------|
| 1      | 15     |
| 5      | 9      |
| 7      | 13     |
| **11** | **3**  |

## Author's Opinion

To fix this, Valve should either:

1. Revert the Initial Swiss Matchups rule
1. Seed the teams using the Initial Swiss Matchups rule throughout the entire Swiss event
1. Come up with a table similar to the six team matchup priority table, but for eight teams
