-- Fix: convite de equipe (TEAM_INVITE) ativava a membership mais recente do usuário em vez da
-- loja do próprio convite aceito. Vincula o token à loja no momento da criação.
ALTER TABLE "UserToken" ADD COLUMN "storeId" TEXT;
