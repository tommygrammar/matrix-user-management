const { MongoClient } = require('mongodb');

// MongoDB connection details
const url = 'mongodb://localhost:27017'; // MongoDB URL
const dbName = 'client'; // MongoDB database name
const collectionName = 'client_collection'; // MongoDB collection name

let db, clientCollection;

async function connectMongoDB() {
    const client = new MongoClient(url);
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName);
    clientCollection = db.collection(collectionName);
}

// Initial number of users
const INITIAL_NUM_USERS = 3;

let sessionMatrix;
let currentNumUsers = INITIAL_NUM_USERS;

// Initialize session matrix
function initializeMatrix(numUsers) {
    sessionMatrix = [
        Array(numUsers).fill(0),  // User IDs
        Array(numUsers).fill(0),  // Login states
        Array(numUsers).fill(0),  // Request counts
        Array(numUsers).fill(0)   // Database section (request status)
    ];

    for (let i = 0; i < numUsers; i++) {
        sessionMatrix[0][i] = i + 1; // Initialize User IDs
    }
}

// Expand the session matrix
function expandMatrix() {
    currentNumUsers += 1;

    sessionMatrix[0].push(currentNumUsers);  // New User ID
    sessionMatrix[1].push(0);                // Initially logged out
    sessionMatrix[2].push(0);                // No requests initially
    sessionMatrix[3].push(0);                // No database interaction

    console.log(`New user (User ${currentNumUsers}) added to the system.`);
}

// Login a user (set login state to 1)
function login(userId) {
    if (userId > 0 && userId <= currentNumUsers) {
        sessionMatrix[1][userId - 1] = 1; // Set login state to 1
        console.log(`User ${userId} has logged in.`);
    } else {
        console.log("Invalid user ID.");
    }
}

// Logout a user (set login state to 0)
function logout(userId) {
    if (userId > 0 && userId <= currentNumUsers) {
        sessionMatrix[1][userId - 1] = 0; // Set login state to 0
        console.log(`User ${userId} has logged out.`);
    } else {
        console.log("Invalid user ID.");
    }
}

// Process a request for a user (read/write to MongoDB)
async function makeRequest(userId, requestType) {
    if (userId > 0 && userId <= currentNumUsers) {
        if (sessionMatrix[1][userId - 1] === 1) { // Check if logged in
            if (requestType === 1) {
                await readFromDatabase(userId);
            } else if (requestType === 2) {
                await writeToDatabase(userId, `This is client ${userId}`, { content: 'Correct' });
            } else {
                console.log(`Invalid request type for user ${userId}.`);
            }
        } else {
            console.log(`User ${userId} is not logged in. Cannot process request.`);
        }
    } else {
        console.log("Invalid user ID.");
    }
}

// Display the session matrix
function displaySessionMatrix() {
    console.log("\nSession Matrix:");
    console.log("User IDs:      ", sessionMatrix[0].join(" "));
    console.log("Login States:  ", sessionMatrix[1].join(" "));
    console.log("Request Types: ", sessionMatrix[2].join(" "));
    console.log("Database:      ", sessionMatrix[3].join(" "));
    console.log("\n");
}

// MongoDB: Read from the database for the given user ID
async function readFromDatabase(userId) {
    try {
        const userDoc = await clientCollection.findOne({ userId: userId });
        if (userDoc) {
            console.log(`User ${userId} document:`, userDoc);
            sessionMatrix[3][userId - 1] = 1; // Indicate a successful database read
        } else {
            console.log(`No document found for User ${userId}.`);
            sessionMatrix[3][userId - 1] = 0; // Indicate no document found
        }
    } catch (error) {
        console.log(`Error reading from database for User ${userId}:`, error);
        sessionMatrix[3][userId - 1] = 0;
    }
}

// MongoDB: Write to the database for the given user ID
async function writeToDatabase(userId, field, data) {
    try {
        await clientCollection.updateOne(
            { userId: userId }, // Document associated with the user ID
            { $set: { userId: userId, field: data } }, // Set the field and content
            { upsert: true } // Create if not exists
        );
        console.log(`User ${userId} document updated successfully.`);
        sessionMatrix[3][userId - 1] = 1; // Indicate a successful database write
    } catch (error) {
        console.log(`Error writing to database for User ${userId}:`, error);
        sessionMatrix[3][userId - 1] = 0;
    }
}

// Main simulation
(async () => {
    await connectMongoDB(); // Connect to MongoDB
    initializeMatrix(INITIAL_NUM_USERS); // Initialize the session matrix

    // Display initial session matrix
    displaySessionMatrix();

    // Simulate actions
    login(1);            // User 1 logs in
    await makeRequest(1, 2);   // User 1 makes a write request to the database
    displaySessionMatrix();

    console.log("Reading from here");
    readFromDatabase(1)

    login(2);            // User 2 logs in
    await makeRequest(2, 1);   // User 2 makes a read request to the database
    displaySessionMatrix();

    logout(1);           // User 1 logs out
    await makeRequest(1, 1);   // User 1 tries to make a request while logged out
    displaySessionMatrix();

    // Add a new user
    expandMatrix();      // Matrix expanded for User 4
    displaySessionMatrix();

    login(4);            // User 4 logs in
    await makeRequest(4, 2);   // User 4 makes a write request to the database
    displaySessionMatrix();



    // Close MongoDB connection after completing all operations
    console.log("Done Implementing");
    await db.client.close(); // Closing the MongoDB connection
})();
