CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  time_of_birth TIME NOT NULL,
  city_of_birth TEXT NOT NULL,
  current_city TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  birth_time_confidence TEXT DEFAULT 'exact',
  ayanamsha TEXT DEFAULT 'LAHIRI',
  data_source TEXT DEFAULT 'astrologyapi',
  raw_chart_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interpretations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chart_id UUID REFERENCES charts(id),
  tab_number INTEGER NOT NULL CHECK (tab_number BETWEEN 1 AND 8),
  tab_name TEXT NOT NULL,
  content TEXT NOT NULL,
  model_used TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chart_id, tab_number)
);

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  called_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT TRUE
);
