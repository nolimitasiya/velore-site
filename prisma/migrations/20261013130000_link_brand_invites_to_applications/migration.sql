-- Link brand invitations to their originating applications.
-- Existing invitations remain valid because applicationId is nullable.

ALTER TABLE "BrandInvite"
ADD COLUMN "applicationId" TEXT;

CREATE INDEX "BrandInvite_applicationId_idx"
ON "BrandInvite"("applicationId");

ALTER TABLE "BrandInvite"
ADD CONSTRAINT "BrandInvite_applicationId_fkey"
FOREIGN KEY ("applicationId")
REFERENCES "BrandApplication"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;