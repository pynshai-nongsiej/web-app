-- 1. Profiles Table (Stores overall user stats)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  mastery_score INTEGER DEFAULT 0,
  total_attempted INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Questions Table (Stores per-user SRS data for each question)
CREATE TABLE user_questions (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  question_id INTEGER,
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recall_score FLOAT DEFAULT 0,
  PRIMARY KEY (user_id, question_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_questions ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for User Questions
CREATE POLICY "Users can view their own question data" ON user_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert their own question data" ON user_questions FOR ALL USING (auth.uid() = user_id);

-- 3. Automatic Profile Creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
