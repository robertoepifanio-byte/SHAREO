-- P3-70: adiciona pontos de reputação ao usuário
ALTER TABLE "users" ADD COLUMN "reputationPoints" INTEGER NOT NULL DEFAULT 0;
