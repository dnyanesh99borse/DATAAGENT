CREATE TABLE country_military (
  id SERIAL PRIMARY KEY,
  country VARCHAR(100),
  year INT,
  tanks INT,
  source_url TEXT,
  extracted_at TIMESTAMP DEFAULT now()
);


INSERT INTO country_military (country, year, tanks, source_url)
VALUES
  ('China', 2023, 4800, 'https://example.com/china-2023'),
  ('China', 2024, 5000, 'https://example.com/china-2024'),
  ('India', 2024, 2000, 'https://example.com/india-2024');


  SELECT * FROM country_military;





  -- 1) Ensure demo_user can connect to the DB
GRANT CONNECT ON DATABASE dataagent_demo TO demo_user;

-- 2) Allow usage of public schema
GRANT USAGE ON SCHEMA public TO demo_user;

-- 3) Give SELECT on the specific table
GRANT SELECT ON TABLE public.country_military TO demo_user;

-- 4) Make future tables automatically readable by demo_user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO demo_user;


SELECT * FROM country_military LIMIT 5;


