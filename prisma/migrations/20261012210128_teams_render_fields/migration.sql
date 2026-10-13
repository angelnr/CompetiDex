/*
  Warnings:

  - Added the required column `name` to the `TeamPokemon` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TeamPokemon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "pokemonId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sprite" TEXT,
    "types" TEXT NOT NULL DEFAULT '[]',
    "level" INTEGER NOT NULL DEFAULT 100,
    "nature" TEXT NOT NULL DEFAULT 'hardy',
    "heldItem" TEXT,
    "ability" TEXT,
    "ivs" TEXT NOT NULL DEFAULT '{}',
    "evs" TEXT NOT NULL DEFAULT '{}',
    "moves" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "TeamPokemon_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TeamPokemon" ("ability", "evs", "heldItem", "id", "ivs", "level", "moves", "nature", "pokemonId", "slot", "teamId") SELECT "ability", "evs", "heldItem", "id", "ivs", "level", "moves", "nature", "pokemonId", "slot", "teamId" FROM "TeamPokemon";
DROP TABLE "TeamPokemon";
ALTER TABLE "new_TeamPokemon" RENAME TO "TeamPokemon";
CREATE UNIQUE INDEX "TeamPokemon_teamId_slot_key" ON "TeamPokemon"("teamId", "slot");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
