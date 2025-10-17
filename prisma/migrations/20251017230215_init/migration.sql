-- CreateTable
CREATE TABLE "Threat" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "attack_pattern" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "discovered_at" TIMESTAMP(3) NOT NULL,
    "tested" BOOLEAN NOT NULL DEFAULT false,
    "effective" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Threat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefenseRule" (
    "rule_id" TEXT NOT NULL,
    "threat_id" INTEGER NOT NULL,
    "attack_type" TEXT NOT NULL,
    "defense_code" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "deployed" BOOLEAN NOT NULL DEFAULT true,
    "rule_spec" JSONB NOT NULL,
    "db_created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DefenseRule_pkey" PRIMARY KEY ("rule_id")
);

-- CreateTable
CREATE TABLE "DetectionEvent" (
    "event_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "input_preview" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "rule_id" TEXT,
    "matches" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectionEvent_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "FeedbackEvent" (
    "event_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "rule_id" TEXT NOT NULL,
    "input_preview" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackEvent_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Threat_attack_pattern_key" ON "Threat"("attack_pattern");

-- CreateIndex
CREATE INDEX "Threat_tested_effective_idx" ON "Threat"("tested", "effective");

-- CreateIndex
CREATE INDEX "Threat_source_type_idx" ON "Threat"("source_type");

-- CreateIndex
CREATE INDEX "Threat_discovered_at_idx" ON "Threat"("discovered_at");

-- CreateIndex
CREATE INDEX "DefenseRule_threat_id_idx" ON "DefenseRule"("threat_id");

-- CreateIndex
CREATE INDEX "DefenseRule_attack_type_idx" ON "DefenseRule"("attack_type");

-- CreateIndex
CREATE INDEX "DefenseRule_created_at_idx" ON "DefenseRule"("created_at");

-- CreateIndex
CREATE INDEX "DetectionEvent_timestamp_idx" ON "DetectionEvent"("timestamp");

-- CreateIndex
CREATE INDEX "DetectionEvent_rule_id_idx" ON "DetectionEvent"("rule_id");

-- CreateIndex
CREATE INDEX "DetectionEvent_allowed_idx" ON "DetectionEvent"("allowed");

-- CreateIndex
CREATE INDEX "FeedbackEvent_timestamp_idx" ON "FeedbackEvent"("timestamp");

-- CreateIndex
CREATE INDEX "FeedbackEvent_rule_id_idx" ON "FeedbackEvent"("rule_id");

-- CreateIndex
CREATE INDEX "FeedbackEvent_label_idx" ON "FeedbackEvent"("label");

-- AddForeignKey
ALTER TABLE "DefenseRule" ADD CONSTRAINT "DefenseRule_threat_id_fkey" FOREIGN KEY ("threat_id") REFERENCES "Threat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectionEvent" ADD CONSTRAINT "DetectionEvent_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "DefenseRule"("rule_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackEvent" ADD CONSTRAINT "FeedbackEvent_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "DefenseRule"("rule_id") ON DELETE CASCADE ON UPDATE CASCADE;
