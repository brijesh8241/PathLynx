const supabase = require('./config/supabase');

async function deleteAllUsers() {
    console.log('🔄 Deleting all users from Supabase for a fresh start...');
    const { data, error } = await supabase
        .from('users')
        .delete()
        .neq('username', 'KEEP_NONE_EXISTS'); // This trick deletes all rows

    if (error) {
        console.error('❌ Error clearing table:', error.message);
    } else {
        console.log('✅ Users table cleared successfully! You can now sign up fresh.');
    }
    process.exit();
}

deleteAllUsers();
