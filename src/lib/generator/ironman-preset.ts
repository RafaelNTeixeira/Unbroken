import type { SlotGroup } from "@/lib/generator/types";

// Mirrors the "11-Hour Ironman Baseline" from the spec exactly:
// 2x swim, 2x bike, 3x run (one of which bricks off the long ride),
// 2x strength bolted onto the tempo run and the aerobic swim.
export function buildIronmanBaselineGroups(): SlotGroup[] {
  return [
    {
      id: "swim-technique",
      primary: {
        discipline: "swim",
        title: "Swim — Speed & Technique",
        durationSec: 60 * 60,
        targetZone: "z4",
      },
    },
    {
      id: "bike-hiit",
      primary: {
        discipline: "bike",
        title: "Bike — Indoor High-Intensity",
        durationSec: 67 * 60,
        targetZone: "z4",
      },
    },
    {
      id: "run-tempo",
      primary: {
        discipline: "run",
        title: "Run — Mid-Week Tempo",
        durationSec: 60 * 60,
        targetZone: "z3",
      },
      bolted: [
        {
          discipline: "strength",
          title: "Strength — Hip Stability & Core",
          durationSec: 30 * 60,
        },
      ],
    },
    {
      id: "swim-aerobic",
      primary: {
        discipline: "swim",
        title: "Swim — Aerobic Endurance",
        durationSec: 60 * 60,
        targetZone: "z2",
      },
      bolted: [
        {
          discipline: "strength",
          title: "Strength — Hip Stability & Core",
          durationSec: 30 * 60,
        },
      ],
    },
    {
      id: "bike-long-run-brick",
      primary: {
        discipline: "bike",
        title: "Bike — Outdoor Long Ride",
        durationSec: 240 * 60,
        targetZone: "z2",
      },
      brickPartner: {
        discipline: "run",
        title: "Run — Off-the-Bike Brick",
        durationSec: 30 * 60,
        targetZone: "z2",
      },
    },
    {
      id: "run-long-aerobic",
      primary: {
        discipline: "run",
        title: "Run — Long Aerobic",
        durationSec: 105 * 60,
        targetZone: "z2",
      },
    },
  ];
}
