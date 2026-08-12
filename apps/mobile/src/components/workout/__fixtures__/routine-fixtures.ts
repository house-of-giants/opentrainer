// Shared fixtures for the routines surfaces (list, builder, editor, import).

export const routinesListFixture = [
  {
    _id: "routine_1",
    name: "Push Pull Legs",
    description: "Classic 3-day split",
    source: "manual" as const,
    days: [
      {
        name: "Push",
        exercises: [
          {
            exerciseName: "Bench Press",
            kind: "lifting" as const,
            targetSets: 4,
            targetReps: "6-8",
          },
          {
            exerciseName: "Overhead Press",
            kind: "lifting" as const,
            targetSets: 3,
            targetReps: "8-10",
          },
        ],
      },
      {
        name: "Pull",
        exercises: [
          {
            exerciseName: "Barbell Row",
            kind: "lifting" as const,
            targetSets: 3,
            targetReps: "8-12",
          },
        ],
      },
    ],
    isActive: true,
    createdAt: new Date("2026-08-01T12:00:00Z").getTime(),
  },
  {
    _id: "routine_2",
    name: "Imported Plan",
    source: "imported" as const,
    days: [
      {
        name: "Day 1",
        exercises: [
          {
            exerciseName: "Squat",
            kind: "lifting" as const,
            targetSets: 5,
            targetReps: "5",
          },
        ],
      },
    ],
    isActive: true,
    createdAt: new Date("2026-07-15T12:00:00Z").getTime(),
  },
];

export const exerciseCatalogFixture = [
  {
    _id: "ex_bench",
    name: "Bench Press",
    category: "lifting" as const,
    muscleGroups: ["chest", "triceps"],
  },
  {
    _id: "ex_squat",
    name: "Squat",
    category: "lifting" as const,
    muscleGroups: ["quads", "glutes"],
  },
  {
    _id: "ex_row",
    name: "Barbell Row",
    category: "lifting" as const,
    muscleGroups: ["back"],
  },
];

export const muscleGroupsFixture = ["back", "chest", "glutes", "quads", "triceps"];

// Matches routines.getRoutine for the editor screen.
export const editorRoutineFixture = {
  _id: "routine_1",
  name: "Push Pull Legs",
  description: "Classic 3-day split",
  source: "manual" as const,
  days: [
    {
      name: "Push",
      exercises: [
        {
          exerciseId: "ex_bench",
          exerciseName: "Bench Press",
          kind: "lifting" as const,
          targetSets: 4,
          targetReps: "6-8",
        },
        {
          exerciseName: "Overhead Press",
          kind: "lifting" as const,
          targetSets: 3,
          targetReps: "8-10",
        },
      ],
    },
    {
      name: "Pull",
      exercises: [
        {
          exerciseId: "ex_row",
          exerciseName: "Barbell Row",
          kind: "lifting" as const,
          targetSets: 3,
          targetReps: "8-12",
        },
      ],
    },
  ],
  isActive: true,
  createdAt: new Date("2026-08-01T12:00:00Z").getTime(),
  updatedAt: new Date("2026-08-01T12:00:00Z").getTime(),
};

// v1 routine-import payload, same shape as the web dialog's example JSON.
export const validRoutineImportJson = JSON.stringify(
  {
    version: 1,
    name: "Imported PPL",
    days: [
      {
        name: "Push Day",
        exercises: [
          { name: "Bench Press", kind: "lifting", targetSets: 4, targetReps: "6-8" },
          {
            name: "Overhead Press",
            kind: "lifting",
            targetSets: 3,
            targetReps: "8-10",
          },
        ],
      },
    ],
  },
  null,
  2,
);
