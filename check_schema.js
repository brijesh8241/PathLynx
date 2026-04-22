require('dotenv').config();
const supabase = require('./config/supabase');

async function checkColumns() {
    console.log('🔍 Inspecting Supabase users table structure...');
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error reading table:', error.message);
    } else {
        const columns = data.length > 0 ? Object.keys(data[0]) : 'Table is empty, cannot inspect columns this way.';
        console.log('📊 Current Columns Found:', columns);
        
        // If empty, try to get schema info via rpc or just suggest standard fix
        if (data.length === 0) {
            console.log('💡 Table is empty. Please run this SQL in your Supabase SQL Editor:');
            console.log(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "selectedPath" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills JSONB;
            `);
        }
    }
    process.exit();
}

checkColumns();
