-- SQL para configurar o Supabase para o VerdeGrana

-- 1. Tabela de Transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saída')),
  amount DECIMAL(12,2) NOT NULL,
  profile_name TEXT NOT NULL DEFAULT 'Principal',
  status TEXT NOT NULL DEFAULT 'realizado' CHECK (status IN ('realizado', 'pendente')),
  is_redutora BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  parent_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Perfis
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, name)
);

-- 3. Tabela de Metadados (Categorias, etc)
CREATE TABLE IF NOT EXISTS userdata (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Segurança)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE userdata ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (Permitir que usuários vejam/editem apenas seus próprios dados)
CREATE POLICY "Usuários podem ver suas próprias transações" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir suas próprias transações" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas próprias transações" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir suas próprias transações" ON transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver seus perfis" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus perfis" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus perfis" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem excluir seus perfis" ON profiles FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver seu userdata" ON userdata FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem gerenciar seu userdata" ON userdata FOR ALL USING (auth.uid() = user_id);
