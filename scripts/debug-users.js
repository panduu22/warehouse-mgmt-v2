const mongoose = require('mongoose');

// Define Schema for inspection
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String
}, { collection: 'users' });

async function listUsers() {
    const MONGODB_URI = "mongodb+srv://pandu:pandu22@cluster0.wywdega.mongodb.net/warehouse-mgmt-v2?retryWrites=true&w=majority";
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        const users = await User.find({});
        
        console.log('--- Current Users ---');
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) [Role: ${u.role}]`);
        });
        console.log('---------------------');
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listUsers();
