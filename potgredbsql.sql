SELECT * FROM country_military LIMIT 5;



-- allow demo_user to connect and read the public schema and the table
CREATE ROLE IF NOT EXISTS demo_user WITH LOGIN PASSWORD 'demo123';

GRANT CONNECT ON DATABASE dataagent_demo TO demo_user;
GRANT USAGE ON SCHEMA public TO demo_user;
GRANT SELECT ON TABLE public.country_military TO demo_user;

-- also make future tables in public readable by demo_user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO demo_user;



--use the space downwards from here for other purposes--
















