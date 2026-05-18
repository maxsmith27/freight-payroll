-- Add GRADE_6 through GRADE_10 to AwardClassificationLevel enum
ALTER TYPE "AwardClassificationLevel" ADD VALUE IF NOT EXISTS 'GRADE_6';
ALTER TYPE "AwardClassificationLevel" ADD VALUE IF NOT EXISTS 'GRADE_7';
ALTER TYPE "AwardClassificationLevel" ADD VALUE IF NOT EXISTS 'GRADE_8';
ALTER TYPE "AwardClassificationLevel" ADD VALUE IF NOT EXISTS 'GRADE_9';
ALTER TYPE "AwardClassificationLevel" ADD VALUE IF NOT EXISTS 'GRADE_10';

-- Add PER_WEEK to AllowanceRateType enum
ALTER TYPE "AllowanceRateType" ADD VALUE IF NOT EXISTS 'PER_WEEK';
