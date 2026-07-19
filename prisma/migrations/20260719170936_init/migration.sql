-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "nba_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "conference" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "logo_url" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "nba_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "position" TEXT,
    "jersey" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "team_id" INTEGER,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_teams" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "team_id" INTEGER NOT NULL,

    CONSTRAINT "user_favorite_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_players" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "player_id" INTEGER NOT NULL,

    CONSTRAINT "user_favorite_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "player_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "start_season" INTEGER NOT NULL,
    "end_season" INTEGER NOT NULL,
    "salaries_by_season" JSONB NOT NULL,
    "option_type" TEXT,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cap_seasons" (
    "season" INTEGER NOT NULL,
    "cap_amount" BIGINT NOT NULL,
    "tax_line" BIGINT NOT NULL,
    "first_apron" BIGINT NOT NULL,
    "second_apron" BIGINT NOT NULL,

    CONSTRAINT "cap_seasons_pkey" PRIMARY KEY ("season")
);

-- CreateTable
CREATE TABLE "news_items" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "image_url" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "dedupe_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_tags" (
    "id" SERIAL NOT NULL,
    "news_item_id" INTEGER NOT NULL,
    "team_id" INTEGER,
    "player_id" INTEGER,

    CONSTRAINT "news_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_nba_id_key" ON "teams"("nba_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_abbreviation_key" ON "teams"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "players_nba_id_key" ON "players"("nba_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_teams_user_id_team_id_key" ON "user_favorite_teams"("user_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_players_user_id_player_id_key" ON "user_favorite_players"("user_id", "player_id");

-- CreateIndex
CREATE INDEX "contracts_team_id_idx" ON "contracts"("team_id");

-- CreateIndex
CREATE INDEX "contracts_end_season_idx" ON "contracts"("end_season");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_player_id_start_season_key" ON "contracts"("player_id", "start_season");

-- CreateIndex
CREATE UNIQUE INDEX "news_items_dedupe_hash_key" ON "news_items"("dedupe_hash");

-- CreateIndex
CREATE INDEX "news_items_published_at_idx" ON "news_items"("published_at" DESC);

-- CreateIndex
CREATE INDEX "news_tags_team_id_idx" ON "news_tags"("team_id");

-- CreateIndex
CREATE INDEX "news_tags_player_id_idx" ON "news_tags"("player_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_teams" ADD CONSTRAINT "user_favorite_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_teams" ADD CONSTRAINT "user_favorite_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_players" ADD CONSTRAINT "user_favorite_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_players" ADD CONSTRAINT "user_favorite_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_tags" ADD CONSTRAINT "news_tags_news_item_id_fkey" FOREIGN KEY ("news_item_id") REFERENCES "news_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_tags" ADD CONSTRAINT "news_tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_tags" ADD CONSTRAINT "news_tags_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
