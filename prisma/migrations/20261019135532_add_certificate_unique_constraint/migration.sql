-- Issue #248: Add unique constraint on Certificate(studentId, courseId) to prevent concurrent issuance
-- First check for and handle any existing duplicates
-- If duplicates exist, keep the most recent one (by issuedAt)
DELETE FROM certificates c1
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id FROM certificates
    INNER JOIN (
      SELECT "studentId", "courseId", MAX("issuedAt") as latest_issued
      FROM certificates
      GROUP BY "studentId", "courseId"
    ) latest ON certificates."studentId" = latest."studentId"
      AND certificates."courseId" = latest."courseId"
      AND certificates."issuedAt" = latest.latest_issued
  ) keep_rows
);

-- Now add the unique constraint
ALTER TABLE certificates ADD CONSTRAINT "certificates_studentId_courseId_key" UNIQUE ("studentId", "courseId");
