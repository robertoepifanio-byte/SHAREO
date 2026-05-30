-- P3-67/68/69: critérios múltiplos + emoji de satisfação + foto na avaliação
ALTER TABLE "reviews" ADD COLUMN "sentiment"       INTEGER;
ALTER TABLE "reviews" ADD COLUMN "itemAsDescribed" INTEGER;
ALTER TABLE "reviews" ADD COLUMN "punctuality"     INTEGER;
ALTER TABLE "reviews" ADD COLUMN "communication"   INTEGER;
ALTER TABLE "reviews" ADD COLUMN "conservation"    INTEGER;
ALTER TABLE "reviews" ADD COLUMN "photoUrl"        TEXT;
