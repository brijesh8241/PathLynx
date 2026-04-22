require('dotenv').config();
const supabase = require('./config/supabase');

async function deleteAllUsers() {
    console.log('🔄 Deleting all users from Supabase for a fresh start...');
    // Delete all rows by using a broad filter
    // If 'id' is the primary key (standard), this will work
    const { data, error } = await supabase
        .from('users')
        .delete()
        .neq('role', 'NON_EXISTENT_ROLE'); 

    if (error) {
        console.error('❌ Error clearing table:', error.message);
        console.log('Trying fallback delete method...');
        const { error: error2 } = await supabase
            .from('users')
            .delete()
            .neq('name', 'NON_EXISTENT_NAME');
            
        if (error2) console.error('❌ Fallback failed too:', error2.message);
    } else {
        console.log('✅ Users table cleared successfully! You can now sign up fresh.');
    }
    process.exit();
}

deleteAllUsers();
