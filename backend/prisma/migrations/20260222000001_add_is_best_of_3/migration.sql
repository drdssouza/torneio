-- AlterTable: adiciona campo isBestOf3 para indicar final melhor de 3 sets (Categoria B)
ALTER TABLE "Match" ADD COLUMN "isBestOf3" BOOLEAN NOT NULL DEFAULT false;
