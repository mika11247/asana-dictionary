import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wxczptnbfeuzlujziysa.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Y3pwdG5iZmV1emx1anppeXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MzMzMjcsImV4cCI6MjA2NjQwOTMyN30.tUXdVoSkSBAbcHS7SnWpDboscNEY6XZrLiIpNvOBDNA'
export const supabase = createClient(supabaseUrl, supabaseKey)
