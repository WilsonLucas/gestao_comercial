// Configuracao do Supabase
// IMPORTANTE: substitua os valores abaixo com os dados do seu projeto Supabase
// Encontre em: Supabase Dashboard -> Settings -> API
const SUPABASE_URL = 'https://mkovqmknscoxhjcdospg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rb3ZxbWtuc2NveGhqY2Rvc3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwODc4NTIsImV4cCI6MjA5MDY2Mzg1Mn0.OcXC_99fiqMUu2bGaBcbTuOKpSK2Z1j6HPcgSinqpLs';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
