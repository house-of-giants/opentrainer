"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { callGemini } from "./gemini";
import { ALL_EQUIPMENT_IDS } from "../lib/equipment";

const EQUIPMENT_PARSER_PROMPT = `You are an equipment parser for a fitness app. Parse the user's gym description into a structured equipment list.

KNOWN GYM CHAINS (use these defaults):
- "Planet Fitness": smith_machine, cable_machine, dumbbells, leg_press, leg_curl, leg_extension, pull_up_bar, treadmill, bike, elliptical (NO barbell, NO power_rack, NO heavy dumbbells)
- "LA Fitness" / "24 Hour Fitness" / "Gold's Gym": Full gym - all equipment available
- "Anytime Fitness": Usually full gym, may vary by location
- "Orange Theory": dumbbells, rower, treadmill, trx (limited strength equipment)
- "CrossFit box": barbell, power_rack, pull_up_bar, kettlebells, rower, rings
- "YMCA": Typically full gym with good variety

HOME GYM PATTERNS:
- "power rack" / "squat rack" / "cage": power_rack, usually implies barbell
- "dumbbells only": dumbbells, possibly adjustable_bench
- "bands" / "resistance bands": resistance_bands
- "pull-up bar" / "doorway bar": pull_up_bar

VALID EQUIPMENT IDS:
${ALL_EQUIPMENT_IDS.join(", ")}

OUTPUT FORMAT (JSON only):
{
  "equipment": ["equipment_id", "equipment_id", ...],
  "note": "Optional note about limitations or assumptions"
}

RULES:
1. Only use equipment IDs from the valid list above
2. When in doubt about a gym chain, assume full equipment
3. Include a note when making assumptions about limitations
4. For home gyms, only include what's explicitly mentioned`;

export interface EquipmentParseResult {
  equipment: string[];
  note?: string;
}

export const parseEquipment = action({
  args: {
    description: v.string(),
  },
  handler: async (_, args): Promise<EquipmentParseResult> => {
    if (!args.description.trim()) {
      return { equipment: [], note: "No description provided" };
    }

    const response = await callGemini({
      systemPrompt: EQUIPMENT_PARSER_PROMPT,
      userMessage: args.description,
      responseFormat: "json",
      maxTokens: 512,
    });

    const result = JSON.parse(response.text) as EquipmentParseResult;

    const validEquipment = result.equipment.filter((id) =>
      ALL_EQUIPMENT_IDS.includes(id as typeof ALL_EQUIPMENT_IDS[number])
    );

    return {
      equipment: validEquipment,
      note: result.note,
    };
  },
});
