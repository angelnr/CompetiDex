"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { CalcSetPanel } from "@/components/calc/CalcSetPanel";
import { FieldPanel } from "@/components/calc/FieldPanel";
import { ResultsPanel } from "@/components/calc/ResultsPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeams } from "@/hooks/useTeams";
import { usePokemon } from "@/lib/queries";
import { teamMemberToCalcInput, titleCase } from "@/lib/calc/convert";
import { computeMatchups, computeOneStats } from "@/lib/calc/engine";
import {
  EMPTY_CALC_FIELD,
  EMPTY_CALC_INPUT,
  type CalcFieldInput,
  type CalcPokemonInput,
  type CalcResult,
  type CalcStats,
} from "@/lib/calc/types";

export function DamageCalculator() {
  const t = useTranslations("calc");
  const { teams } = useTeams();

  const [attacker, setAttacker] = useState<CalcPokemonInput>(EMPTY_CALC_INPUT);
  const [defender, setDefender] = useState<CalcPokemonInput>({ ...EMPTY_CALC_INPUT });
  const [field, setField] = useState<CalcFieldInput>(EMPTY_CALC_FIELD);

  const [attackerStats, setAttackerStats] = useState<CalcStats["attacker"] | null>(null);
  const [defenderStats, setDefenderStats] = useState<CalcStats["defender"] | null>(null);
  const [results, setResults] = useState<CalcResult[]>([]);
  const [busy, setBusy] = useState(false);

  // Habilidades de PokeAPI (todas las ranuras; @smogon/calc solo trae la
  // primera). El valor es el slug kebab y el panel lo localiza.
  const { data: attackerData } = usePokemon(attacker.species ?? undefined);
  const { data: defenderData } = usePokemon(defender.species ?? undefined);
  const attackerAbilities = attackerData?.abilities.map((a) => a.ability.name) ?? [];
  const defenderAbilities = defenderData?.abilities.map((a) => a.ability.name) ?? [];

  // El nivel global se propaga a ambos lados.
  useEffect(() => {
    setAttacker((a) => ({ ...a, level: field.level }));
    setDefender((d) => ({ ...d, level: field.level }));
  }, [field.level]);

  // Stats finales de cada lado, independientes (no requiere el otro lado).
  useEffect(() => {
    if (!attacker.species) {
      setAttackerStats(null);
      return;
    }
    computeOneStats(attacker)
      .then(setAttackerStats)
      .catch(() => setAttackerStats(null));
  }, [attacker]);
  useEffect(() => {
    if (!defender.species) {
      setDefenderStats(null);
      return;
    }
    computeOneStats(defender)
      .then(setDefenderStats)
      .catch(() => setDefenderStats(null));
  }, [defender]);

  // Matchups con debounce pequeño (recalcula al escribir EVs/movimientos).
  useEffect(() => {
    if (!attacker.species || !defender.species) {
      setResults([]);
      return;
    }
    setBusy(true);
    const handle = setTimeout(() => {
      computeMatchups(attacker, defender, field)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setBusy(false));
    }, 200);
    return () => clearTimeout(handle);
  }, [attacker, defender, field]);

  const members = teams.flatMap((team) =>
    team.members.map((m) => ({ teamId: team.id, teamName: team.name, member: m })),
  );

  const loadMember = (key: string | null) => {
    if (!key) return;
    const idx = members.findIndex((m) => `${m.teamName}\u0000${m.member.pokemonId}` === key);
    const entry = idx >= 0 ? members[idx] : undefined;
    if (!entry) return;
    const input = teamMemberToCalcInput(entry.member, field.level);
    // No sabemos si ha de ir a atacante o defensor: el patrón de uso habitual
    // rellena el lado enfocado; simplificamos rellenando el atacante.
    setAttacker(input);
  };

  // Intercambia atacante y defensor (todos los campos: especie, habilidad,
  // objeto, IVs, EVs, aumentos y movimientos).
  const swapSides = () => {
    setAttacker(defender);
    setDefender(attacker);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <CalcSetPanel
          side="attacker"
          input={attacker}
          stats={attackerStats}
          abilities={attackerAbilities}
          level={field.level}
          onChange={(patch) => setAttacker((a) => ({ ...a, ...patch }))}
        />

        <div className="w-full shrink-0 lg:w-72">
          <FieldPanel
            field={field}
            onChange={(patch) => setField((f) => ({ ...f, ...patch }))}
            onSwap={swapSides}
          />
        </div>

        <CalcSetPanel
          side="defender"
          input={defender}
          stats={defenderStats}
          abilities={defenderAbilities}
          level={field.level}
          onChange={(patch) => setDefender((d) => ({ ...d, ...patch }))}
        />
      </div>

      {/* Cargar desde equipo */}
      {members.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="calc-from-team" className="text-sm text-muted-foreground">
            {t("loadFromTeam")}
          </label>
          <Select onValueChange={loadMember}>
            <SelectTrigger id="calc-from-team" className="w-full max-w-xs">
              <SelectValue placeholder={t("loadFromTeamPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) =>
                team.members.map((m) => (
                  <SelectItem
                    key={`${team.name}\u0000${m.pokemonId}`}
                    value={`${team.name}\u0000${m.pokemonId}`}
                  >
                    {team.name} · {titleCase(m.name)}
                  </SelectItem>
                )),
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="relative">
        {busy && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {t("calculating")}
          </div>
        )}
        <ResultsPanel results={results} />
      </div>
    </div>
  );
}
