/**
 * Proxy cacheado a PokeAPI.
 *
 * Toda la UI consume este endpoint en lugar de pokeapi.co, de modo que
 * el caché Redis aplica en cliente (a través de TanStack Query) y en
 * servidor (a través de `lib/pokeapi`). Ver AGENTS.md §4.2.
 *
 * Uso:
 *   GET /api/pokemon                  -> lista (?offset&limit)
 *   GET /api/pokemon?id=25            -> detalle de Pokémon
 *   GET /api/pokemon?species=25       -> species
 *   GET /api/pokemon?evolution=10     -> evolution-chain por id
 *   GET /api/pokemon?type=electric    -> tipo
 *   GET /api/pokemon?type-list=true   -> lista de tipos
 *
 * Respuestas normalizadas: 200 con body, 400 param faltante,
 * 404 upstream (PokeAPI no encontrado), 500 error inesperado.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPokemon,
  getPokemonList,
  getPokemonSpecies,
  getEvolutionChain,
  getType,
  getTypeList,
  PokeAPIError,
  type ListOptions,
} from "@/lib/pokeapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listSchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(2000).optional(),
});

const idParam = z.union([z.coerce.number().int().positive(), z.string().min(1)]);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function handleError(err: unknown) {
  if (err instanceof PokeAPIError) {
    if (err.status === 404) {
      return NextResponse.json({ error: "Pokemon no encontrado" }, { status: 404 });
    }
    console.error(`[api/pokemon] upstream ${err.status} en ${err.endpoint}`);
    return NextResponse.json({ error: "Error desde PokeAPI", status: err.status }, { status: 502 });
  }
  console.error("[api/pokemon] error inesperado:", err);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  try {
    if (searchParams.has("id")) {
      const id = idParam.parse(searchParams.get("id"));
      const data = await getPokemon(id);
      return NextResponse.json(data);
    }

    if (searchParams.has("species")) {
      const id = idParam.parse(searchParams.get("species"));
      const data = await getPokemonSpecies(id);
      return NextResponse.json(data);
    }

    if (searchParams.has("evolution")) {
      const id = z.coerce.number().int().positive().parse(searchParams.get("evolution"));
      const data = await getEvolutionChain(id);
      return NextResponse.json(data);
    }

    if (searchParams.has("type")) {
      const id = idParam.parse(searchParams.get("type"));
      const data = await getType(id);
      return NextResponse.json(data);
    }

    if (searchParams.has("type-list")) {
      const opts = listSchema.parse({
        offset: searchParams.get("offset") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
      });
      const data = await getTypeList(opts as ListOptions);
      return NextResponse.json(data);
    }

    // Lista de Pokémon por defecto
    const opts = listSchema.parse({
      offset: searchParams.get("offset") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    const data = await getPokemonList(opts as ListOptions);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issue = err.issues[0];
      return badRequest(`Parámetro inválido: ${issue?.message ?? "desconocido"}`);
    }
    return handleError(err);
  }
}
